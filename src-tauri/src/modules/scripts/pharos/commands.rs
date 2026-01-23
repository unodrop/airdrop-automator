use super::api::PharosClient;
use super::types::*;
use crate::modules::wallet::utils::decrypt_private_key;
use crate::modules::wallet::WalletAccount;
use alloy::network::{Ethereum, EthereumWallet, TransactionBuilder};
use alloy::primitives::utils::{format_units, parse_units};
use alloy::providers::{Provider, ProviderBuilder};
use alloy::rpc::types::TransactionRequest;
use alloy::signers::local::PrivateKeySigner;
use alloy::signers::Signer;
use lazy_static::lazy_static;
use rand::seq::SliceRandom;
use rand::Rng;
use serde::Serialize;
use std::collections::HashMap;
use tauri::{Emitter, Manager};
use tokio::sync::Mutex as AsyncMutex;

use alloy::sol;
use alloy::sol_types::SolCall;

// Global state for Pharos tasks
lazy_static! {
    static ref PHAROS_STATE: AsyncMutex<PharosState> = AsyncMutex::new(PharosState::new());
}

pub struct PharosState {
    pub is_running: bool,
    pub should_stop: bool,
    pub task_results: HashMap<String, PharosTaskResult>,
}

impl PharosState {
    pub fn new() -> Self {
        Self {
            is_running: false,
            should_stop: false,
            task_results: HashMap::new(),
        }
    }
}

#[derive(Clone, Serialize)]
struct LogEvent {
    address: String,
    message: String,
    level: String, // "info", "success", "error"
    timestamp: u64,
}

fn emit_log(app: &tauri::AppHandle, address: &str, message: &str, level: &str) {
    let _ = app.emit(
        "pharos_log",
        LogEvent {
            address: address.to_string(),
            message: message.to_string(),
            level: level.to_string(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
        },
    );
}

#[tauri::command]
pub async fn get_pharos_status() -> Result<PharosStatusResponse, String> {
    let state = PHAROS_STATE.lock().await;
    Ok(PharosStatusResponse {
        is_running: state.is_running,
        results: state.task_results.clone(),
    })
}

#[tauri::command]
pub async fn stop_pharos_tasks() -> Result<(), String> {
    let mut state = PHAROS_STATE.lock().await;
    state.should_stop = true;
    Ok(())
}

#[tauri::command]
pub async fn start_pharos_tasks(
    app: tauri::AppHandle,
    invite_code: Option<String>,
) -> Result<(), String> {
    let mut state = PHAROS_STATE.lock().await;
    if state.is_running {
        return Err("Tasks are already running".to_string());
    }
    state.is_running = true;
    state.should_stop = false;
    // Clear previous results or keep them? Let's clear for "Start All" semantics
    state.task_results.clear();
    drop(state);

    // Spawn a background task
    let app_handle = app.clone();
    let code = invite_code.unwrap_or("S6NGMzXSCDBxhnwo".to_string());

    tauri::async_runtime::spawn(async move {
        match run_pharos_tasks(app_handle, &code).await {
            Ok(_) => {}
            Err(e) => eprintln!("Pharos tasks error: {}", e),
        }

        // Reset running state
        let mut state = PHAROS_STATE.lock().await;
        state.is_running = false;
        state.should_stop = false;
    });

    Ok(())
}

async fn run_pharos_tasks(app: tauri::AppHandle, invite_code: &str) -> Result<(), String> {
    emit_log(&app, "SYSTEM", "Starting tasks...", "info");

    // 1. Get wallets
    let wallets_cmd = crate::modules::wallet::get_wallets(app.clone()).await;
    let wallets = match wallets_cmd {
        Ok(w) => w,
        Err(e) => {
            let msg = format!("Failed to load wallets: {}", e);
            emit_log(&app, "SYSTEM", &msg, "error");
            return Err(msg);
        }
    };

    if wallets.is_empty() {
        emit_log(&app, "SYSTEM", "No wallets found", "error");
        return Ok(());
    }

    // Shuffle wallets for random execution order
    let mut shuffled_wallets = wallets.clone();
    {
        let mut rng = rand::thread_rng();
        shuffled_wallets.shuffle(&mut rng);
    }

    // 2. Iterate wallets
    for wallet in shuffled_wallets {
        // Check for stop signal
        {
            let state = PHAROS_STATE.lock().await;
            if state.should_stop {
                emit_log(&app, "SYSTEM", "Tasks stopped by user", "info");
                break;
            }
        }

        // Update status to running locally (optional, frontend handles "running" via logs or optimistic update)
        // But better to update global state so `get_pharos_status` returns correct info
        {
            let mut state = PHAROS_STATE.lock().await;
            state.task_results.insert(
                wallet.address.clone(),
                PharosTaskResult {
                    success: false,
                    message: "Running...".to_string(),
                    jwt: None,
                },
            );
        }

        let result = execute_single_login(&app, &wallet.address, invite_code).await;

        // Save result
        let mut state = PHAROS_STATE.lock().await;
        let final_res = match result {
            Ok(res) => res,
            Err(e) => PharosTaskResult {
                success: false,
                message: e,
                jwt: None,
            },
        };
        state.task_results.insert(wallet.address.clone(), final_res);
    }

    emit_log(&app, "SYSTEM", "All tasks completed", "success");
    Ok(())
}

async fn process_pharos_http_tasks(
    app: &tauri::AppHandle,
    address: &str,
    signature_param: &str,
    invite_code: &str,
) -> Result<Option<String>, PharosTaskResult> {
    // 1. Login
    emit_log(app, address, "Sending login request...", "info");
    let client = PharosClient::new(address, None).map_err(|e| {
        emit_log(app, address, &e, "error");
        PharosTaskResult {
            success: false,
            message: e,
            jwt: None,
        }
    })?;

    let login_res = client
        .login(signature_param, invite_code)
        .await
        .map_err(|e| {
            emit_log(app, address, &e, "error");
            PharosTaskResult {
                success: false,
                message: e,
                jwt: None,
            }
        })?;

    if login_res.code != 0 {
        emit_log(
            app,
            address,
            &format!("Login failed: {}", login_res.msg),
            "error",
        );
        return Err(PharosTaskResult {
            success: false,
            message: format!("Login failed: {}", login_res.msg),
            jwt: None,
        });
    }

    let jwt = if let Some(data) = login_res.data {
        if let Some(jwt) = data.jwt {
            emit_log(app, address, "Login successful! JWT obtained.", "success");
            jwt
        } else {
            emit_log(app, address, "Login successful but no JWT found.", "error");
            return Err(PharosTaskResult {
                success: false,
                message: "No JWT in response".to_string(),
                jwt: None,
            });
        }
    } else {
        emit_log(app, address, "Login successful but no data found.", "error");
        return Err(PharosTaskResult {
            success: false,
            message: "No data in response".to_string(),
            jwt: None,
        });
    };

    let client = PharosClient::new(address, Some(jwt.clone())).map_err(|e| {
        emit_log(app, address, &e, "error");
        PharosTaskResult {
            success: false,
            message: e,
            jwt: Some(jwt.clone()),
        }
    })?;

    // 2. Check-in
    emit_log(app, address, "Sending check-in request...", "info");
    let check_in_res = client.check_in().await;
    match check_in_res {
        Ok(res) => {
            if res.code == 0 {
                emit_log(app, address, "Check-in successful", "success");
            } else {
                emit_log(
                    app,
                    address,
                    &format!("Check-in failed: {}", res.msg),
                    "error",
                );
            }
        }
        Err(e) => {
            emit_log(app, address, &format!("Check-in error: {}", e), "error");
        }
    }

    // 3. Claim Faucet
    emit_log(app, address, "Checking faucet status...", "info");
    let faucet_status = client.get_faucet_status().await;
    match faucet_status {
        Ok(res) => {
            if res.code == 0 {
                if let Some(data) = res.data {
                    if data.is_able_to_faucet {
                        emit_log(app, address, "Faucet available, claiming...", "info");
                        let claim_res = client.claim_faucet().await;
                        match claim_res {
                            Ok(claim_data) => {
                                if claim_data.code == 0 {
                                    emit_log(
                                        app,
                                        address,
                                        "Faucet claimed successfully",
                                        "success",
                                    );
                                } else {
                                    emit_log(
                                        app,
                                        address,
                                        &format!("Faucet claim failed: {}", claim_data.msg),
                                        "error",
                                    );
                                }
                            }
                            Err(e) => {
                                emit_log(
                                    app,
                                    address,
                                    &format!("Faucet claim error: {}", e),
                                    "error",
                                );
                            }
                        }
                    } else {
                        emit_log(
                            app,
                            address,
                            "Faucet not available (already claimed?)",
                            "info",
                        );
                    }
                } else {
                    emit_log(app, address, "Faucet status no data", "error");
                }
            } else {
                emit_log(
                    app,
                    address,
                    &format!("Faucet status check failed: {}", res.msg),
                    "error",
                );
            }
        }
        Err(e) => {
            emit_log(
                app,
                address,
                &format!("Faucet status error: {}", e),
                "error",
            );
        }
    }

    // 4. Fetch Profile
    emit_log(app, address, "Fetching user profile...", "info");
    let profile_res = client.get_profile().await;
    match profile_res {
        Ok(profile_data) => {
            if profile_data.code == 0 {
                if let Some(data) = profile_data.data {
                    if let Some(user_info) = data.user_info {
                        let msg = format!(
                            "Success! ID: {} | Points: {} | Total: {}",
                            user_info.id, user_info.task_points, user_info.total_points
                        );
                        emit_log(app, address, &msg, "success");
                    } else {
                        emit_log(app, address, "Profile fetched but no user info", "error");
                    }
                } else {
                    emit_log(app, address, "Profile fetched but no data", "error");
                }
            } else {
                let msg = format!("Fetch profile failed: {}", profile_data.msg);
                emit_log(app, address, &msg, "error");
            }
        }
        Err(e) => {
            emit_log(app, address, &format!("Profile error: {}", e), "error");
        }
    }

    Ok(Some(jwt))
}

async fn process_pharos_chain_tasks(
    app: &tauri::AppHandle,
    _jwt: Option<String>,
    private_key: &str, // Need private key for signing transactions
) -> Result<(), PharosTaskResult> {
    // Setup signer first to get address
    let signer: PrivateKeySigner = match private_key.parse() {
        Ok(s) => s,
        Err(e) => {
            // We don't have address yet for logging, use "SYSTEM" or try to handle gracefully
            // But if private key is invalid we can't really proceed.
            // Since this function is called after execute_single_login where private key was already decrypted and potentially used/checked?
            // Actually in execute_single_login we parse it too.
            let msg = format!("Invalid private key: {}", e);
            emit_log(app, "UNKNOWN", &msg, "error");
            return Err(PharosTaskResult {
                success: false,
                message: msg,
                jwt: _jwt,
            });
        }
    };

    let addr = signer.address();
    let address = addr.to_string(); // Use checksummed address string for logs
    let address = address.as_str();

    emit_log(app, address, "Checking PHRS balance...", "info");

    // Setup provider with wallet
    let rpc_url = "https://atlantic.dplabs-internal.com";
    let url = match reqwest::Url::parse(rpc_url) {
        Ok(u) => u,
        Err(e) => {
            let msg = format!("Invalid RPC URL: {}", e);
            emit_log(app, address, &msg, "error");
            return Err(PharosTaskResult {
                success: false,
                message: msg,
                jwt: _jwt,
            });
        }
    };

    let wallet = EthereumWallet::from(signer);
    let provider = ProviderBuilder::new().wallet(wallet).connect_http(url);

    // Check Balance
    let balance = match provider.get_balance(addr).await {
        Ok(b) => b,
        Err(e) => {
            let msg = format!("Failed to check balance: {}", e);
            emit_log(app, address, &msg, "error");
            return Err(PharosTaskResult {
                success: false,
                message: msg,
                jwt: _jwt,
            });
        }
    };

    let eth_str = format_units(balance, "ether").unwrap_or_else(|_| "0".to_string());
    let eth_val = eth_str.parse::<f64>().unwrap_or(0.0);

    emit_log(
        app,
        address,
        &format!("Current balance: {:.4} PHRS", eth_val),
        "info",
    );

    if eth_val < 0.001 {
        emit_log(
            app,
            address,
            "Balance insufficient (< 0.001 PHRS). Skipping native token transfer/wrap tasks.",
            "warn",
        );
    } else {
        emit_log(
            app,
            address,
            "Balance sufficient. Starting native token tasks...",
            "success",
        );
        // Perform tasks that require ETH/PHRS
        // 1. Send Token To Friends
        send_token_to_friends(app, &provider, address, _jwt.as_deref()).await?;

        // 2. Wrap PHRS
        wrap_phrs(app, &provider, address, _jwt.as_deref()).await?;
    }

    // 3. Swap Token (WPHRS -> USDC/USDT)
    swap_token(app, &provider, address, _jwt.as_deref()).await?;

    // 4. Add Liquidity
    add_liquidity(app, &provider, address, _jwt.as_deref()).await?;

    Ok(())
}

async fn add_liquidity<P>(
    app: &tauri::AppHandle,
    provider: &P,
    address: &str,
    jwt: Option<&str>,
) -> Result<(), PharosTaskResult>
where
    P: Provider<Ethereum>,
{
    // DODOV2Proxy02 Address
    let pm_addr: alloy::primitives::Address = POSITION_MANAGER_ADDRESS.parse().unwrap();
    let my_addr: alloy::primitives::Address = address.parse().unwrap();

    // WARNING: We need the DVM Pool Address (DLP) for WPHRS/USDC and WPHRS/USDT.
    // Placeholder addresses set below. YOU MUST REPLACE THESE WITH REAL DLP ADDRESSES.
    let wphrs_usdc_dlp: alloy::primitives::Address = "0x969d72e652a2223a372d82992d27847726756210".parse().unwrap();
    let wphrs_usdt_dlp: alloy::primitives::Address = "0xc4874f67c42732a677337c726a481f26487df770".parse().unwrap();

    // Pairs: (DLP Address, Token0 Addr, Token1 Addr, Token0 Sym, Token1 Sym)
    // Assuming WPHRS is Base, USDC/USDT is Quote in the DVM.
    let pairs = vec![
        (wphrs_usdc_dlp, WPHRS_ADDRESS, USDC_ADDRESS, "WPHRS", "USDC"),
        (wphrs_usdt_dlp, WPHRS_ADDRESS, USDT_ADDRESS, "WPHRS", "USDT"),
    ];

    for i in 1..=10 {
        emit_log(
            app,
            address,
            &format!("Starting Liquidity task {}/10...", i),
            "info",
        );

        // 1. Pick random pair
        let (dlp_addr, token0_str, token1_str, sym0, sym1) = {
            let mut rng = rand::thread_rng();
            pairs.choose(&mut rng).unwrap().clone()
        };

        if dlp_addr == alloy::primitives::Address::ZERO {
            emit_log(app, address, "DLP Pool Address not set! Skipping liquidity add.", "error");
            break;
        }

        let token0_addr: alloy::primitives::Address = token0_str.parse().unwrap();
        let token1_addr: alloy::primitives::Address = token1_str.parse().unwrap();

        // 2. Check Balance & Approval for BOTH tokens
        let mut base_amount_u256 = alloy::primitives::U256::ZERO;
        let mut quote_amount_u256 = alloy::primitives::U256::ZERO;
        let mut balance_ok = true;

        for (t_addr, t_sym) in &[(token0_addr, sym0), (token1_addr, sym1)] {
            let check = check_balance_and_approval(
                app,
                provider,
                my_addr,
                *t_addr,
                pm_addr,
                "0.0001", // Using string as requested
                t_sym,
            ).await;

            match check {
                Ok(Some(amt)) => {
                    if *t_sym == sym0 {
                        base_amount_u256 = amt;
                    } else {
                        quote_amount_u256 = amt;
                    }
                },
                Ok(None) => {
                    balance_ok = false;
                    break;
                },
                Err(_) => {
                    balance_ok = false;
                    break;
                }
            }
        }

        if !balance_ok {
            continue;
        }

        // 3. Add Liquidity
        let dlp_addr: alloy::primitives::Address = if sym1 == "USDC" {
            wphrs_usdc_dlp
        } else {
            wphrs_usdt_dlp
        };

        // WARNING: Using same amount for base and quote might fail if pool ratio is not 1:1
        // But logic follows original intent.
        let data = addDVMLiquidityCall {
            pool: dlp_addr,
            baseInAmount: base_amount_u256,
            quoteInAmount: quote_amount_u256,
            baseMinAmount: alloy::primitives::U256::ONE,
            quoteMinAmount: alloy::primitives::U256::ONE,
            flag: 0, // 0 for adding liquidity
            deadLine: alloy::primitives::U256::from(
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs()
                    + 1800,
            ),
        }
        .abi_encode();

        let tx = TransactionRequest::default()
            .with_to(pm_addr)
            .with_input(data)
            .with_gas_limit(800_000)
            .with_max_priority_fee_per_gas(1_000_000_000)
            .with_max_fee_per_gas(20_000_000_000);

        let tx_hash_str;
        let mut mint_success = false;

        match provider.send_transaction(tx).await {
            Ok(pending) => {
                tx_hash_str = pending.tx_hash().to_string();
                emit_log(
                    app,
                    address,
                    &format!("DODO Liquidity tx sent: {}", tx_hash_str),
                    "info",
                );

                match pending.get_receipt().await {
                    Ok(receipt) => {
                        if receipt.status() {
                            emit_log(
                                app,
                                address,
                                &format!("Liquidity Add {} success", i),
                                "success",
                            );
                            mint_success = true;
                        } else {
                            emit_log(app, address, "Liquidity Add failed (reverted)", "error");
                        }
                    }
                    Err(e) => emit_log(app, address, &format!("Receipt error: {}", e), "error"),
                }
            }
            Err(e) => {
                emit_log(
                    app,
                    address,
                    &format!("Liquidity tx failed: {}", e),
                    "error",
                );
                continue;
            }
        }

        // 4. Verify
        if mint_success {
            if let Some(token) = jwt {
                match verify_pharos_task(app, address, token, &tx_hash_str, 401).await {
                    Ok(true) => emit_log(app, address, "Liquidity verified", "success"),
                    Ok(false) => emit_log(app, address, "Liquidity verification failed", "warn"),
                    Err(e) => {
                        emit_log(app, address, &format!("Verification error: {}", e), "error")
                    }
                }
            }
        }

        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    }
    Ok(())
}

const WPHRS_ADDRESS: &str = "0x838800b758277cc111b2d48ab01e5e164f8e9471";
const ROUTER_ADDRESS: &str = "0x819829e5cf6e19f9fed92f6b4cc1edf45a2cc4a2"; // DODOFeeRouteProxy from screenshot
// Updated Position Manager Address from user feedback/explorer
const POSITION_MANAGER_ADDRESS: &str = "0x680829027709e2ef95d079ac97ddf5feab82d248"; 
const USDC_ADDRESS: &str = "0xe0be08c77f415f577a1b3a9ad7a1df1479564ec8";
const USDT_ADDRESS: &str = "0xe7e84b8b4f39c507499c40b4ac199b050e2882d5";

sol! {
    // DODO FeeRouteProxy Interface
     function mixSwap(
         address fromToken,
         address toToken,
         uint256 fromTokenAmount,
         uint256 minReturnAmount,
         address[] mixAdapters,
         address[] mixPairs,
         address[] assetTo,
         uint256 directions,
         bytes[] moreInfos,
         uint256 deadLine
     ) external payable returns (uint256 returnAmount);
     
     // DODO V2 Proxy Interface
     function addDVMLiquidity(
         address pool,
         uint256 baseInAmount,
         uint256 quoteInAmount,
         uint256 baseMinAmount,
         uint256 quoteMinAmount,
         uint8 flag,
         uint256 deadLine
     ) external payable returns (uint256 shares, uint256 baseAdjustedIn, uint256 quoteAdjustedIn);

     #[derive(Debug, PartialEq, Eq)]
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);

    // Multicall with deadline (as requested by user)
    function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results);

    // ERC20 Interface
    interface IERC20 {
        function balanceOf(address account) external view returns (uint256);
        function allowance(address owner, address spender) external view returns (uint256);
        function approve(address spender, uint256 amount) external returns (bool);
        function decimals() external view returns (uint8);
        function deposit() external payable;
        function withdraw(uint256 wad) external;
    }
}

async fn get_erc20_balance<P>(
    provider: &P,
    token: alloy::primitives::Address,
    owner: alloy::primitives::Address,
) -> alloy::primitives::U256
where
    P: Provider<Ethereum>,
{
    let call_data = IERC20::balanceOfCall { account: owner }.abi_encode();
    let tx = TransactionRequest::default().with_to(token).with_input(call_data);
    match provider.call(tx).await {
        Ok(bytes) => IERC20::balanceOfCall::abi_decode_returns(&bytes).unwrap_or(alloy::primitives::U256::ZERO),
        Err(_) => alloy::primitives::U256::ZERO,
    }
}

async fn get_erc20_decimals<P>(
    provider: &P,
    token: alloy::primitives::Address,
) -> u8
where
    P: Provider<Ethereum>,
{
    let call_data = IERC20::decimalsCall {}.abi_encode();
    let tx = TransactionRequest::default().with_to(token).with_input(call_data);
    match provider.call(tx).await {
        Ok(bytes) => IERC20::decimalsCall::abi_decode_returns(&bytes).unwrap_or(18),
        Err(_) => 18,
    }
}

async fn check_balance_and_approval<P>(
    app: &tauri::AppHandle,
    provider: &P,
    wallet_address: alloy::primitives::Address,
    token_address: alloy::primitives::Address,
    spender_address: alloy::primitives::Address,
    amount_str: &str,
    token_symbol: &str,
) -> Result<Option<alloy::primitives::U256>, String>
where
    P: Provider<Ethereum>,
{
    let address_str = wallet_address.to_string();

    // 1. Get Decimals
    let decimals = get_erc20_decimals(provider, token_address).await;

    // 2. Parse Amount
    let amount_pu = match parse_units(amount_str, decimals) {
        Ok(a) => a,
        Err(e) => {
            let msg = format!("Failed to parse amount {}: {}", amount_str, e);
            emit_log(app, &address_str, &msg, "error");
            return Err(msg);
        }
    };
    let amount: alloy::primitives::U256 = amount_pu.into();

    // 3. Check Balance
    let balance = get_erc20_balance(provider, token_address, wallet_address).await;

    if balance < amount {
        let bal_fmt = format_units(balance, decimals).unwrap_or_else(|_| "0".to_string());
        let msg = format!(
            "Skipping: Insufficient {} balance: {} < {}",
            token_symbol, bal_fmt, amount_str
        );
        emit_log(app, &address_str, &msg, "warn");
        return Ok(None);
    }

    // 4. Check Allowance
    let allowance_call = IERC20::allowanceCall {
        owner: wallet_address,
        spender: spender_address,
    }
    .abi_encode();
    let tx = TransactionRequest::default().with_to(token_address).with_input(allowance_call);
    let allowance = match provider.call(tx).await {
        Ok(bytes) => IERC20::allowanceCall::abi_decode_returns(&bytes).unwrap_or(alloy::primitives::U256::ZERO),
        Err(e) => {
             let msg = format!("Failed to check allowance for {}: {}", token_symbol, e);
             emit_log(app, &address_str, &msg, "error");
             return Err(msg);
        }
    };

    if allowance < amount {
        emit_log(app, &address_str, &format!("Approving {} tokens for {}...", amount_str, spender_address), "info");

        let approve_data = IERC20::approveCall {
            spender: spender_address,
            amount: alloy::primitives::U256::MAX,
        }
        .abi_encode();
        
        let tx = TransactionRequest::default()
            .with_to(token_address)
            .with_input(approve_data)
            .with_gas_limit(100_000)
            .with_max_priority_fee_per_gas(1_000_000_000)
            .with_max_fee_per_gas(20_000_000_000);

        match provider.send_transaction(tx).await {
            Ok(pending) => {
                let _ = pending.get_receipt().await;
                emit_log(app, &address_str, "Approval completed", "success");
            }
            Err(e) => {
                let msg = format!("Balance/approval check failed: {}", e);
                emit_log(app, &address_str, &msg, "error");
                return Ok(None);
            }
        }
    }

    Ok(Some(amount))
}

async fn swap_token<P>(
    app: &tauri::AppHandle,
    provider: &P,
    address: &str,
    jwt: Option<&str>,
) -> Result<(), PharosTaskResult>
where
    P: Provider<Ethereum>,
{
    let router_addr: alloy::primitives::Address = ROUTER_ADDRESS.parse().unwrap();
    let my_addr: alloy::primitives::Address = address.parse().unwrap();

    let tokens = vec![
        (WPHRS_ADDRESS, "WPHRS"),
        (USDC_ADDRESS, "USDC"),
        (USDT_ADDRESS, "USDT"),
    ];

    for i in 1..=10 {
        emit_log(
            app,
            address,
            &format!("Starting Swap task {}/10...", i),
            "info",
        );

        let mut shuffled_tokens = tokens.clone();
        {
            let mut rng = rand::thread_rng();
            shuffled_tokens.shuffle(&mut rng);
        }

        let mut swap_performed = false;

        for (src_addr_str, src_symbol) in &shuffled_tokens {
            let src_addr: alloy::primitives::Address = src_addr_str.parse().unwrap();
            
            // Random amount between 0.001 and 0.01 for WPHRS/USDC/USDT
            // This avoids fetching balance manually.
            let amount_str = "0.01"; 

            // Check Approval
            let approved_amount_opt = check_balance_and_approval(
                app,
                provider,
                my_addr,
                src_addr,
                router_addr,
                amount_str,
                src_symbol,
            ).await.map_err(|e| PharosTaskResult {
                success: false,
                message: e,
                jwt: None,
            })?;

            let amount_in = match approved_amount_opt {
                Some(amt) => amt,
                None => continue,
            };

            let amount_display = amount_str;
            emit_log(
                app,
                address,
                &format!(
                    "Swapping {} {} to {}",
                    amount_display, src_symbol, "..."
                ),
                "info",
            );

            // Pick destination
            let (_dst_addr_str, dst_symbol, dst_addr) = {
                let mut rng = rand::thread_rng();
                let targets: Vec<_> = tokens.iter().filter(|(a, _)| *a != *src_addr_str).collect();
                let (a, s) = targets.choose(&mut rng).unwrap();
                (*a, *s, a.parse::<alloy::primitives::Address>().unwrap())
            };

            // Execute Swap (DODO mixSwap)
            let deadline = alloy::primitives::U256::from(
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs()
                    + 1800, 
            );

            // Define Pool Addresses
            let wphrs_usdc_dlp: alloy::primitives::Address = "0x969d72e652a2223a372d82992d27847726756210".parse().unwrap();
            let wphrs_usdt_dlp: alloy::primitives::Address = "0xc4874f67c42732a677337c726a481f26487df770".parse().unwrap();

            let mut pool_addr = alloy::primitives::Address::ZERO;
            let mut direction = 0u64;

            if *src_addr_str == WPHRS_ADDRESS {
                direction = 0;
                if _dst_addr_str == USDC_ADDRESS { pool_addr = wphrs_usdc_dlp; }
                else if _dst_addr_str == USDT_ADDRESS { pool_addr = wphrs_usdt_dlp; }
            } else if *src_addr_str == USDC_ADDRESS {
                direction = 1;
                pool_addr = wphrs_usdc_dlp;
            } else if *src_addr_str == USDT_ADDRESS {
                direction = 1;
                pool_addr = wphrs_usdt_dlp;
            }

            if pool_addr == alloy::primitives::Address::ZERO {
                emit_log(app, address, "Pool address not found for pair. Skipping swap.", "error");
                continue;
            }

            let mix_adapters = vec![alloy::primitives::Address::ZERO];
            let mix_pairs = vec![pool_addr];
            let asset_to = vec![my_addr];
            let directions = alloy::primitives::U256::from(direction);
            let more_infos = vec![alloy::primitives::Bytes::new()];
            
            let tx_data = mixSwapCall {
                fromToken: src_addr,
                toToken: dst_addr,
                fromTokenAmount: amount_in,
                minReturnAmount: alloy::primitives::U256::ONE,
                mixAdapters: mix_adapters,
                mixPairs: mix_pairs,
                assetTo: asset_to,
                directions,
                moreInfos: more_infos,
                deadLine: deadline,
            }.abi_encode();

            let tx = TransactionRequest::default()
                .with_to(router_addr)
                .with_input(tx_data)
                .with_gas_limit(500_000)
                .with_max_priority_fee_per_gas(1_000_000_000)
                .with_max_fee_per_gas(20_000_000_000);

            match provider.send_transaction(tx).await {
                Ok(pending) => {
                    let tx_hash_str = pending.tx_hash().to_string();
                    emit_log(
                        app,
                        address,
                        &format!("Swap tx sent: {}", tx_hash_str),
                        "info",
                    );

                    match pending.get_receipt().await {
                        Ok(receipt) => {
                            if receipt.status() {
                                emit_log(app, address, &format!("Swap {} success", i), "success");
                                
                                // Verify Task (ID 402)
                                if let Some(token) = jwt {
                                    match verify_pharos_task(app, address, token, &tx_hash_str, 402).await {
                                        Ok(true) => emit_log(app, address, "Swap verified", "success"),
                                        Ok(false) => emit_log(app, address, "Swap verification failed", "warn"),
                                        Err(e) => emit_log(app, address, &format!("Verification error: {}", e), "error"),
                                    }
                                }
                                swap_performed = true;
                            } else {
                                emit_log(app, address, "Swap failed (reverted)", "error");
                            }
                        }
                        Err(e) => emit_log(app, address, &format!("Receipt error: {}", e), "error"),
                    }
                }
                Err(e) => {
                    emit_log(app, address, &format!("Swap tx failed: {}", e), "error");
                    continue;
                }
            }

            if swap_performed {
                break;
            }
        }

        if !swap_performed {
            emit_log(app, address, "No valid token/balance for swap or swap failed.", "warn");
        }

        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    }
    Ok(())
}

async fn wrap_phrs<P>(
    app: &tauri::AppHandle,
    provider: &P,
    address: &str,
    jwt: Option<&str>,
) -> Result<(), PharosTaskResult>
where
    P: Provider<Ethereum>,
{
    // Perform 10 wraps
    for i in 1..=10 {
        emit_log(
            app,
            address,
            &format!("Starting Wrap PHRS task {}/10...", i),
            "info",
        );

        // Random amount 0.001 - 0.005
        let amount_f64: f64 = {
            let mut rng = rand::thread_rng();
            rng.gen_range(0.001..0.005)
        };
        let amount_wei = parse_units(&format!("{:.6}", amount_f64), "ether")
            .unwrap()
            .into();

        // Check balance
        let addr: alloy::primitives::Address = address.parse().unwrap();
        let balance = provider
            .get_balance(addr)
            .await
            .map_err(|e| PharosTaskResult {
                success: false,
                message: format!("Failed to check balance: {}", e),
                jwt: jwt.map(|s| s.to_string()),
            })?;

        if balance < amount_wei {
            emit_log(
                app,
                address,
                &format!("Insufficient balance for wrap: needs {} PHRS", amount_f64),
                "warn",
            );
            break;
        }

        // Prepare transaction
        let wphrs_addr: alloy::primitives::Address = WPHRS_ADDRESS.parse().unwrap();
        // deposit() selector: 0xd0e30db0
        let data = hex::decode("d0e30db0").unwrap();

        let tx = TransactionRequest::default()
            .with_to(wphrs_addr)
            .with_value(amount_wei)
            .with_input(data)
            .with_gas_limit(100_000)
            .with_max_priority_fee_per_gas(1_000_000_000)
            .with_max_fee_per_gas(20_000_000_000);

        // Send transaction
        let tx_hash;
        match provider.send_transaction(tx).await {
            Ok(pending_tx) => {
                tx_hash = pending_tx.tx_hash().to_string();
                emit_log(
                    app,
                    address,
                    &format!("Wrap {} tx sent: {}", i, tx_hash),
                    "info",
                );

                match pending_tx.get_receipt().await {
                    Ok(receipt) => {
                        if receipt.status() {
                            emit_log(
                                app,
                                address,
                                &format!("Wrap {} success: {}", i, tx_hash),
                                "success",
                            );
                        } else {
                            emit_log(
                                app,
                                address,
                                &format!("Wrap {} failed (reverted)", i),
                                "error",
                            );
                            return Err(PharosTaskResult {
                                success: false,
                                message: format!("Wrap {} reverted", i),
                                jwt: jwt.map(|s| s.to_string()),
                            });
                        }
                    }
                    Err(e) => {
                        emit_log(
                            app,
                            address,
                            &format!("Failed to get wrap {} receipt: {}", i, e),
                            "error",
                        );
                        return Err(PharosTaskResult {
                            success: false,
                            message: format!("Failed to get wrap {} receipt: {}", i, e),
                            jwt: jwt.map(|s| s.to_string()),
                        });
                    }
                }
            }
            Err(e) => {
                emit_log(
                    app,
                    address,
                    &format!("Failed to send wrap {} tx: {}", i, e),
                    "error",
                );
                return Err(PharosTaskResult {
                    success: false,
                    message: format!("Failed to send wrap {} tx: {}", i, e),
                    jwt: jwt.map(|s| s.to_string()),
                });
            }
        }

        // Verify Task
        if let Some(token) = jwt {
            emit_log(
                app,
                address,
                &format!("Verifying wrap task {}...", i),
                "info",
            );
            // Using 401 for task_id as per original code
            match verify_pharos_task(app, address, token, &tx_hash, 401).await {
                Ok(true) => {
                    emit_log(
                        app,
                        address,
                        &format!("Wrap task {} verified successfully", i),
                        "success",
                    );
                }
                Ok(false) => {
                    emit_log(
                        app,
                        address,
                        &format!("Wrap task {} verification failed", i),
                        "error",
                    );
                }
                Err(e) => {
                    emit_log(app, address, &format!("Verification error: {}", e), "error");
                }
            }
        }

        // Small delay between wraps
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    }

    Ok(())
}

#[allow(dead_code)]
async fn send_token_to_friends<P>(
    app: &tauri::AppHandle,
    provider: &P,
    address: &str,
    jwt: Option<&str>,
) -> Result<(), PharosTaskResult>
where
    P: Provider<Ethereum>,
{
    // Perform 10 transfers
    for i in 1..=10 {
        emit_log(
            app,
            address,
            &format!("Executing transfer {}/10...", i),
            "info",
        );

        // Generate random recipient
        let random_wallet = PrivateKeySigner::random();
        let to_address = random_wallet.address();

        // Amount: 0.000001 PHRS
        let value = parse_units("0.000001", "ether").unwrap().into();

        let tx = TransactionRequest::default()
            .with_to(to_address)
            .with_value(value)
            .with_gas_limit(21_000)
            .with_max_priority_fee_per_gas(1_000_000_000)
            .with_max_fee_per_gas(20_000_000_000);

        // Send transaction
        let tx_hash;

        match provider.send_transaction(tx).await {
            Ok(pending_tx) => {
                tx_hash = pending_tx.tx_hash().to_string();
                emit_log(app, address, &format!("Tx sent: {}", tx_hash), "info");

                // Wait for receipt automatically (alloy handles polling)
                match pending_tx.get_receipt().await {
                    Ok(receipt) => {
                        if receipt.status() {
                            emit_log(
                                app,
                                address,
                                &format!("Transfer {} success: {}", i, tx_hash),
                                "success",
                            );
                        } else {
                            emit_log(
                                app,
                                address,
                                &format!("Transfer {} failed (reverted)", i),
                                "error",
                            );
                            return Err(PharosTaskResult {
                                success: false,
                                message: format!("Transfer {} reverted", i),
                                jwt: jwt.map(|s| s.to_string()),
                            });
                        }
                    }
                    Err(e) => {
                        emit_log(
                            app,
                            address,
                            &format!("Failed to get receipt: {}", e),
                            "error",
                        );
                        return Err(PharosTaskResult {
                            success: false,
                            message: format!("Failed to get receipt: {}", e),
                            jwt: jwt.map(|s| s.to_string()),
                        });
                    }
                }
            }
            Err(e) => {
                emit_log(app, address, &format!("Failed to send tx: {}", e), "error");
                return Err(PharosTaskResult {
                    success: false,
                    message: format!("Failed to send tx: {}", e),
                    jwt: jwt.map(|s| s.to_string()),
                });
            }
        }

        // Verify Task
        if let Some(token) = jwt {
            emit_log(
                app,
                address,
                &format!("Verifying transfer {} task...", i),
                "info",
            );
            match verify_pharos_task(app, address, token, &tx_hash, 401).await {
                Ok(true) => {
                    emit_log(
                        app,
                        address,
                        &format!("Transfer {} verified successfully", i),
                        "success",
                    );
                }
                Ok(false) => {
                    emit_log(
                        app,
                        address,
                        &format!("Transfer {} verification failed", i),
                        "error",
                    );
                    // Continue or stop? Usually stop if verification is critical
                }
                Err(e) => {
                    emit_log(app, address, &format!("Verification error: {}", e), "error");
                }
            }
        } else {
            emit_log(app, address, "Skipping verification (no JWT)", "error");
        }

        // Small delay between transfers
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    }

    Ok(())
}

async fn verify_pharos_task(
    app: &tauri::AppHandle,
    address: &str,
    jwt: &str,
    tx_hash: &str,
    task_id: u32,
) -> Result<bool, String> {
    let verify_url = format!(
        "https://api.pharosnetwork.xyz/task/verify?address={}&task_id={}&tx_hash={}",
        address, task_id, tx_hash
    );

    let client = reqwest::Client::new();

    // Generate random user agent
    // Since we don't have random-useragent crate, we'll use a fixed one or a few random ones
    let ua = {
        let user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ];
        let mut rng = rand::thread_rng();
        let idx = rng.gen_range(0..user_agents.len());
        user_agents[idx].to_string()
    };

    let res = client
        .post(&verify_url)
        .header("accept", "application/json, text/plain, */*")
        .header("accept-language", "en-US,en;q=0.8")
        .header("authorization", format!("Bearer {}", jwt))
        .header("priority", "u=1, i")
        .header(
            "sec-ch-ua",
            "\"Chromium\";v=\"136\", \"Brave\";v=\"136\", \"Not.A/Brand\";v=\"99\"",
        )
        .header("sec-ch-ua-mobile", "?0")
        .header("sec-ch-ua-platform", "\"Windows\"")
        .header("sec-fetch-dest", "empty")
        .header("sec-fetch-mode", "cors")
        .header("sec-fetch-site", "same-site")
        .header("sec-gpc", "1")
        .header("Referer", "https://testnet.pharosnetwork.xyz/")
        .header("Referrer-Policy", "strict-origin-when-cross-origin")
        .header("User-Agent", ua)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;

    if let Some(code) = json.get("code") {
        if code.as_i64() == Some(0) {
            if let Some(data) = json.get("data") {
                if let Some(verified) = data.get("verified") {
                    return Ok(verified.as_bool().unwrap_or(false));
                }
            }
        } else {
            let msg = json
                .get("msg")
                .and_then(|m| m.as_str())
                .unwrap_or("Unknown error");
            emit_log(
                app,
                address,
                &format!("Verification API failed: {}", msg),
                "error",
            );
        }
    }

    Ok(false)
}

async fn execute_single_login(
    app: &tauri::AppHandle,
    address: &str,
    invite_code: &str,
) -> Result<PharosTaskResult, String> {
    emit_log(app, address, "Starting login process...", "info");

    // 1. Get private key
    emit_log(app, address, "Decrypting private key...", "info");
    let app_password = "unodrop_secure_password_2024";
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let wallets_path = data_dir.join("wallets.json");

    if !wallets_path.exists() {
        let msg = "No wallets found";
        emit_log(app, address, msg, "error");
        return Err(msg.to_string());
    }

    let content = std::fs::read_to_string(&wallets_path).map_err(|e| e.to_string())?;
    let wallets: Vec<WalletAccount> = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    let wallet = wallets
        .iter()
        .find(|w| w.address.eq_ignore_ascii_case(address))
        .ok_or_else(|| {
            let msg = "Wallet not found";
            emit_log(app, address, msg, "error");
            msg.to_string()
        })?;

    let private_key_str =
        decrypt_private_key(&wallet.encrypted_key, app_password).map_err(|e| {
            emit_log(app, address, &format!("Decryption failed: {}", e), "error");
            e
        })?;

    let clean_key = if private_key_str.starts_with("0x") {
        &private_key_str[2..]
    } else {
        &private_key_str
    };

    // 2. Sign message
    emit_log(app, address, "Signing message 'pharos'...", "info");
    let signer = clean_key.parse::<PrivateKeySigner>().map_err(|e| {
        emit_log(
            app,
            address,
            &format!("Invalid private key: {}", e),
            "error",
        );
        format!("Invalid private key: {}", e)
    })?;

    let message = "pharos";
    let signature = signer.sign_message(message.as_bytes()).await.map_err(|e| {
        emit_log(app, address, &format!("Signing failed: {}", e), "error");
        format!("Signing failed: {}", e)
    })?;

    let signature_str = signature.to_string();
    let signature_param = if signature_str.starts_with("0x") {
        signature_str
    } else {
        format!("0x{}", signature_str)
    };

    // 3. Process HTTP Tasks
    let jwt = match process_pharos_http_tasks(app, address, &signature_param, invite_code).await {
        Ok(jwt) => jwt,
        Err(res) => return Ok(res),
    };

    // 4. Process Chain Tasks
    match process_pharos_chain_tasks(app, jwt.clone(), clean_key).await {
        Ok(_) => Ok(PharosTaskResult {
            success: true,
            message: "All tasks completed successfully".to_string(),
            jwt,
        }),
        Err(res) => Ok(res),
    }
}

// Keep the original command for single execution if needed, or deprecate it
#[tauri::command]
pub async fn execute_pharos_login(
    app: tauri::AppHandle,
    address: String,
    _proxy: Option<String>,
) -> Result<PharosTaskResult, String> {
    execute_single_login(&app, &address, "S6NGMzXSCDBxhnwo").await
}
