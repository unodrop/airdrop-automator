use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Duration;
use tokio::time::sleep;

const CAPSOLVER_API_URL: &str = "https://api.capsolver.com";

#[derive(Debug, Serialize, Deserialize)]
#[allow(non_snake_case)]
struct CreateTaskResponse {
    errorId: i32,
    errorCode: Option<String>,
    errorDescription: Option<String>,
    taskId: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[allow(non_snake_case)]
struct TaskResultResponse {
    errorId: i32,
    errorCode: Option<String>,
    errorDescription: Option<String>,
    status: String,
    solution: Option<TurnstileSolution>,
}

#[derive(Debug, Serialize, Deserialize)]
#[allow(non_snake_case)]
struct TurnstileSolution {
    token: String,
    userAgent: Option<String>,
}

pub async fn solve_turnstile(
    api_key: &str,
    website_url: &str,
    website_key: &str,
    proxy: Option<&str>,
    task_type_override: Option<&str>,
) -> Result<String, String> {
    let client = Client::new();

    // 1. Create Task
    let task_type = if let Some(t) = task_type_override {
        t
    } else if proxy.is_some() {
        "AntiTurnstileTask"
    } else {
        "AntiTurnstileTaskProxyless"
    };

    let mut task_payload = json!({
        "type": task_type,
        "websiteURL": website_url,
        "websiteKey": website_key,
    });

    if let Some(proxy_str) = proxy {
         task_payload.as_object_mut().unwrap().insert("proxy".to_string(), json!(proxy_str));
    }

    let create_body = json!({
        "clientKey": api_key,
        "task": task_payload
    });

    let create_res: CreateTaskResponse = client
        .post(format!("{}/createTask", CAPSOLVER_API_URL))
        .json(&create_body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    if create_res.errorId != 0 {
        return Err(format!(
            "Create task failed: {} - {}",
            create_res.errorCode.unwrap_or_default(),
            create_res.errorDescription.unwrap_or_default()
        ));
    }

    let task_id = create_res.taskId.ok_or("No taskId returned")?;

    // 2. Get Task Result
    let result_body = json!({
        "clientKey": api_key,
        "taskId": task_id
    });

    let mut attempts = 0;
    loop {
        if attempts > 60 { // Timeout after ~2 minutes
            return Err("Timeout waiting for solution".to_string());
        }
        
        sleep(Duration::from_secs(2)).await;
        attempts += 1;

        let result_res: TaskResultResponse = client
            .post(format!("{}/getTaskResult", CAPSOLVER_API_URL))
            .json(&result_body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        if result_res.errorId != 0 {
            return Err(format!(
                "Get result failed: {} - {}",
                result_res.errorCode.unwrap_or_default(),
                result_res.errorDescription.unwrap_or_default()
            ));
        }

        if result_res.status == "ready" {
            return Ok(result_res.solution.ok_or("No solution found")?.token);
        }

        if result_res.status == "failed" {
             return Err("Task failed".to_string());
        }
    }
}
