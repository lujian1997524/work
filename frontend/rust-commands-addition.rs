// 在现有main.rs基础上添加的新命令

// 获取第一个可用的CAD应用路径（简化版）
#[command]
async fn detect_cad_applications() -> String {
    let detection_result = detect_cad_software().await;
    
    // 返回第一个检测到的CAD软件路径
    for software in detection_result.software {
        if software.detected {
            return software.exec_path;
        }
    }
    
    String::new()
}

// 获取所有可用的CAD应用列表（用于前端选择）
#[command]
async fn get_available_cad_applications() -> Vec<String> {
    let detection_result = detect_cad_software().await;
    
    detection_result.software
        .into_iter()
        .filter(|s| s.detected)
        .map(|s| format!("{} ({})", s.name, s.exec_path))
        .collect()
}

// 优化的下载和保存命令（支持前端调用）
#[command]
async fn download_and_save_drawing(
    drawing_url: String, 
    filename: String, 
    auth_token: Option<String>
) -> Result<String, String> {
    use std::io::Write;
    
    println!("下载图纸: {} -> {}", drawing_url, filename);
    
    // 创建HTTP客户端
    let client = reqwest::Client::new();
    let mut request = client.get(&drawing_url);
    
    // 添加认证头
    if let Some(token) = auth_token {
        request = request.header("Authorization", format!("Bearer {}", token));
    }
    
    let response = request
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("HTTP错误: {}", response.status()));
    }
    
    let content = response
        .bytes()
        .await
        .map_err(|e| format!("下载内容失败: {}", e))?;
    
    if content.is_empty() {
        return Err("下载的文件为空".to_string());
    }

    // 保存到临时目录
    let temp_dir = std::env::temp_dir();
    let temp_path = temp_dir.join(&filename);
    
    let mut file = std::fs::File::create(&temp_path)
        .map_err(|e| format!("创建临时文件失败: {}", e))?;
    
    file.write_all(&content)
        .map_err(|e| format!("写入文件失败: {}", e))?;

    println!("文件保存完成: {:?} ({} bytes)", temp_path, content.len());
    
    Ok(temp_path.to_string_lossy().to_string())
}

// 获取系统信息（用于前端平台检测）
#[command]
async fn get_system_info() -> std::collections::HashMap<String, String> {
    let mut info = std::collections::HashMap::new();
    
    info.insert("os".to_string(), std::env::consts::OS.to_string());
    info.insert("arch".to_string(), std::env::consts::ARCH.to_string());
    info.insert("family".to_string(), std::env::consts::FAMILY.to_string());
    
    // 添加环境信息
    if let Ok(user) = std::env::var("USER") {
        info.insert("user".to_string(), user);
    } else if let Ok(username) = std::env::var("USERNAME") {
        info.insert("user".to_string(), username);
    }
    
    info
}