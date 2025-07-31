// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::Path;
use std::process::Command;
use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CADSoftware {
    pub name: String,
    pub exec_path: String,
    pub extensions: Vec<String>,
    pub software_type: String,
    pub detected: bool,
    pub method: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CADResult {
    pub success: bool,
    pub software: Option<String>,
    pub message: String,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DetectionResult {
    pub success: bool,
    pub software: Vec<CADSoftware>,
    pub supported_extensions: Vec<String>,
}

// 检测Windows平台的CAD软件
#[cfg(target_os = "windows")]
fn detect_windows_cad() -> Vec<CADSoftware> {
    let mut detected = Vec::new();
    
    let cad_software = vec![
        // AutoCAD系列
        CADSoftware {
            name: "AutoCAD 2024".to_string(),
            exec_path: "C:\\Program Files\\Autodesk\\AutoCAD 2024\\acad.exe".to_string(),
            extensions: vec![".dwg".to_string(), ".dxf".to_string()],
            software_type: "autocad".to_string(),
            detected: false,
            method: "file_check".to_string(),
        },
        CADSoftware {
            name: "AutoCAD 2023".to_string(),
            exec_path: "C:\\Program Files\\Autodesk\\AutoCAD 2023\\acad.exe".to_string(),
            extensions: vec![".dwg".to_string(), ".dxf".to_string()],
            software_type: "autocad".to_string(),
            detected: false,
            method: "file_check".to_string(),
        },
        CADSoftware {
            name: "AutoCAD 2022".to_string(),
            exec_path: "C:\\Program Files\\Autodesk\\AutoCAD 2022\\acad.exe".to_string(),
            extensions: vec![".dwg".to_string(), ".dxf".to_string()],
            software_type: "autocad".to_string(),
            detected: false,
            method: "file_check".to_string(),
        },
        CADSoftware {
            name: "AutoCAD 2021".to_string(),
            exec_path: "C:\\Program Files\\Autodesk\\AutoCAD 2021\\acad.exe".to_string(),
            extensions: vec![".dwg".to_string(), ".dxf".to_string()],
            software_type: "autocad".to_string(),
            detected: false,
            method: "file_check".to_string(),
        },
        CADSoftware {
            name: "AutoCAD 2020".to_string(),
            exec_path: "C:\\Program Files\\Autodesk\\AutoCAD 2020\\acad.exe".to_string(),
            extensions: vec![".dwg".to_string(), ".dxf".to_string()],
            software_type: "autocad".to_string(),
            detected: false,
            method: "file_check".to_string(),
        },
        // CAXA系列
        CADSoftware {
            name: "CAXA CAD电子图板".to_string(),
            exec_path: "C:\\CAXA\\CAD电子图板\\CAD.exe".to_string(),
            extensions: vec![".exb".to_string(), ".dwg".to_string(), ".dxf".to_string()],
            software_type: "caxa".to_string(),
            detected: false,
            method: "file_check".to_string(),
        },
        CADSoftware {
            name: "CAXA CAD 2020".to_string(),
            exec_path: "C:\\CAXA\\CAD2020\\CAD.exe".to_string(),
            extensions: vec![".exb".to_string(), ".dwg".to_string(), ".dxf".to_string()],
            software_type: "caxa".to_string(),
            detected: false,
            method: "file_check".to_string(),
        },
        CADSoftware {
            name: "CAXA CAD 2019".to_string(),
            exec_path: "C:\\CAXA\\CAD2019\\CAD.exe".to_string(),
            extensions: vec![".exb".to_string(), ".dwg".to_string(), ".dxf".to_string()],
            software_type: "caxa".to_string(),
            detected: false,
            method: "file_check".to_string(),
        },
        // 其他CAD软件
        CADSoftware {
            name: "SolidWorks".to_string(),
            exec_path: "C:\\Program Files\\SOLIDWORKS Corp\\SOLIDWORKS\\SLDWORKS.exe".to_string(),
            extensions: vec![".sldprt".to_string(), ".sldasm".to_string(), ".slddrw".to_string(), ".dwg".to_string(), ".dxf".to_string()],
            software_type: "solidworks".to_string(),
            detected: false,
            method: "file_check".to_string(),
        },
        CADSoftware {
            name: "Fusion 360".to_string(),
            exec_path: "C:\\Users\\%USERNAME%\\AppData\\Local\\Autodesk\\webdeploy\\production\\Fusion360.exe".to_string(),
            extensions: vec![".f3d".to_string(), ".step".to_string(), ".dwg".to_string(), ".dxf".to_string()],
            software_type: "fusion360".to_string(),
            detected: false,
            method: "file_check".to_string(),
        },
    ];

    for mut software in cad_software {
        // 展开环境变量
        let expanded_path = software.exec_path.replace("%USERNAME%", &std::env::var("USERNAME").unwrap_or_default());
        software.exec_path = expanded_path.clone();
        
        if Path::new(&expanded_path).exists() {
            software.detected = true;
            detected.push(software);
        }
    }

    detected
}

// 检测macOS平台的CAD软件
#[cfg(target_os = "macos")]
fn detect_macos_cad() -> Vec<CADSoftware> {
    let mut detected = Vec::new();
    
    let mac_cad_software = vec![
        CADSoftware {
            name: "AutoCAD for Mac".to_string(),
            exec_path: "/Applications/Autodesk/AutoCAD.app".to_string(),
            extensions: vec![".dwg".to_string(), ".dxf".to_string()],
            software_type: "autocad".to_string(),
            detected: false,
            method: "application_bundle".to_string(),
        },
        CADSoftware {
            name: "Fusion 360".to_string(),
            exec_path: "/Applications/Autodesk Fusion 360.app".to_string(),
            extensions: vec![".f3d".to_string(), ".step".to_string(), ".dwg".to_string(), ".dxf".to_string()],
            software_type: "fusion360".to_string(),
            detected: false,
            method: "application_bundle".to_string(),
        },
        CADSoftware {
            name: "SolidWorks".to_string(),
            exec_path: "/Applications/SOLIDWORKS.app".to_string(),
            extensions: vec![".sldprt".to_string(), ".sldasm".to_string(), ".slddrw".to_string()],
            software_type: "solidworks".to_string(),
            detected: false,
            method: "application_bundle".to_string(),
        },
        CADSoftware {
            name: "FreeCAD".to_string(),
            exec_path: "/Applications/FreeCAD.app".to_string(),
            extensions: vec![".fcstd".to_string(), ".step".to_string(), ".iges".to_string()],
            software_type: "freecad".to_string(),
            detected: false,
            method: "application_bundle".to_string(),
        },
    ];

    for mut software in mac_cad_software {
        if Path::new(&software.exec_path).exists() {
            software.detected = true;
            detected.push(software);
        }
    }

    detected
}

// 检测Linux平台的CAD软件
#[cfg(target_os = "linux")]
fn detect_linux_cad() -> Vec<CADSoftware> {
    let mut detected = Vec::new();
    
    let linux_cad_software = vec![
        ("freecad", "FreeCAD", vec![".fcstd".to_string(), ".step".to_string()]),
        ("librecad", "LibreCAD", vec![".dxf".to_string()]),
        ("qcad", "QCAD", vec![".dxf".to_string()]),
    ];

    for (command, name, extensions) in linux_cad_software {
        if let Ok(_) = Command::new("which").arg(command).output() {
            detected.push(CADSoftware {
                name: name.to_string(),
                exec_path: command.to_string(),
                extensions,
                software_type: command.to_string(),
                detected: true,
                method: "command_line".to_string(),
            });
        }
    }

    detected
}

#[command]
async fn detect_cad_software() -> DetectionResult {
    let software = {
        #[cfg(target_os = "windows")]
        { detect_windows_cad() }
        
        #[cfg(target_os = "macos")]
        { detect_macos_cad() }
        
        #[cfg(target_os = "linux")]
        { detect_linux_cad() }
        
        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        { Vec::new() }
    };

    let mut supported_extensions = std::collections::HashSet::new();
    for soft in &software {
        if soft.detected {
            for ext in &soft.extensions {
                supported_extensions.insert(ext.clone());
            }
        }
    }

    DetectionResult {
        success: true,
        software,
        supported_extensions: supported_extensions.into_iter().collect(),
    }
}

#[command]
async fn open_cad_file(file_path: String, drawing_id: Option<u32>) -> CADResult {
    println!("尝试打开CAD文件: {}", file_path);
    
    // 获取文件扩展名
    let extension = Path::new(&file_path)
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| format!(".{}", s.to_lowercase()))
        .unwrap_or_default();

    // 首先下载文件（如果是HTTP URL）
    let local_file_path = if file_path.starts_with("http") {
        match download_file(&file_path, drawing_id).await {
            Ok(path) => path,
            Err(e) => {
                return CADResult {
                    success: false,
                    software: None,
                    message: "文件下载失败".to_string(),
                    error: Some(e),
                };
            }
        }
    } else {
        file_path.clone()
    };

    // 检测CAD软件
    let detection_result = detect_cad_software().await;
    
    // 找到支持该文件类型的软件
    let compatible_software: Vec<_> = detection_result.software
        .into_iter()
        .filter(|s| s.detected && s.extensions.contains(&extension))
        .collect();

    if compatible_software.is_empty() {
        return CADResult {
            success: false,
            software: None,
            message: format!("未找到支持 {} 文件的CAD软件", extension),
            error: Some("No compatible CAD software found".to_string()),
        };
    }

    // 选择优先级最高的软件
    let software = &compatible_software[0];
    
    let result = match open_file_with_software(&local_file_path, software).await {
        Ok(_) => CADResult {
            success: true,
            software: Some(software.name.clone()),
            message: format!("文件已用 {} 打开", software.name),
            error: None,
        },
        Err(e) => CADResult {
            success: false,
            software: Some(software.name.clone()),
            message: format!("使用 {} 打开文件失败", software.name),
            error: Some(e),
        },
    };

    result
}

async fn download_file(url: &str, drawing_id: Option<u32>) -> Result<String, String> {
    use std::io::Write;
    
    println!("下载文件: {}", url);
    
    // 创建HTTP客户端
    let client = reqwest::Client::new();
    
    // 检查URL是否包含token参数
    let mut request = client.get(url);
    
    // 如果URL包含token参数，提取并作为Bearer token使用
    if url.contains("token=") {
        if let Ok(parsed_url) = url::Url::parse(url) {
            if let Some(token) = parsed_url.query_pairs().find(|(key, _)| key == "token") {
                let auth_header = format!("Bearer {}", token.1);
                println!("使用认证头: {}", auth_header);
                
                // 重建不包含token参数的URL
                let mut clean_url = parsed_url.clone();
                clean_url.set_query(None);
                request = client.get(clean_url.as_str())
                    .header("Authorization", auth_header);
            }
        }
    }
    
    let response = request
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {}", e))?;
    
    println!("HTTP响应状态: {}", response.status());
    
    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        println!("HTTP错误响应内容: {}", error_text);
        return Err(format!("HTTP错误: {} - {}", status, error_text));
    }
    
    println!("开始读取响应内容...");
    
    let content = response
        .bytes()
        .await
        .map_err(|e| format!("下载内容失败: {}", e))?;

    println!("响应内容大小: {} bytes", content.len());
    
    if content.is_empty() {
        return Err("下载的文件为空".to_string());
    }

    // 创建临时文件
    let temp_dir = std::env::temp_dir();
    let file_name = if let Some(id) = drawing_id {
        format!("drawing_{}.{}", id, get_extension_from_url(url))
    } else {
        format!("temp_drawing.{}", get_extension_from_url(url))
    };
    
    let temp_path = temp_dir.join(file_name);
    
    println!("写入临时文件: {:?}", temp_path);
    
    let mut file = std::fs::File::create(&temp_path)
        .map_err(|e| format!("创建临时文件失败: {}", e))?;
    
    file.write_all(&content)
        .map_err(|e| format!("写入文件失败: {}", e))?;

    println!("文件下载完成: {:?} ({} bytes)", temp_path, content.len());
    
    Ok(temp_path.to_string_lossy().to_string())
}

fn get_extension_from_url(url: &str) -> String {
    // 从URL中提取文件扩展名，优先检查常见的CAD格式
    if url.contains(".dxf") || url.contains("drawings/") {
        "dxf".to_string()  // 图纸接口默认返回DXF文件
    } else if url.contains(".dwg") {
        "dwg".to_string()
    } else {
        "dxf".to_string()  // 默认为DXF格式
    }
}

async fn open_file_with_software(file_path: &str, software: &CADSoftware) -> Result<(), String> {
    println!("使用 {} 打开文件: {}", software.name, file_path);
    
    #[cfg(target_os = "windows")]
    {
        let mut cmd = Command::new(&software.exec_path);
        cmd.arg(file_path);
        
        cmd.spawn()
            .map_err(|e| format!("启动软件失败: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        let mut cmd = Command::new("open");
        if software.exec_path.ends_with(".app") {
            cmd.arg("-a").arg(&software.exec_path);
        }
        cmd.arg(file_path);
        
        cmd.spawn()
            .map_err(|e| format!("启动软件失败: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        let mut cmd = Command::new(&software.exec_path);
        cmd.arg(file_path);
        
        cmd.spawn()
            .map_err(|e| format!("启动软件失败: {}", e))?;
    }
    
    Ok(())
}

// 使用指定路径打开CAD文件的命令
#[command]
async fn open_cad_file_with_path(file_path: String, cad_path: String) -> CADResult {
    println!("使用指定路径打开CAD文件: {} -> {}", cad_path, file_path);
    
    // 首先下载文件
    let local_file_path = match download_file(&file_path, None).await {
        Ok(path) => path,
        Err(err) => {
            return CADResult {
                success: false,
                message: format!("文件下载失败: {}", err),
                software: None,
                error: Some(err),
            };
        }
    };
    
    // 使用指定路径启动CAD软件
    match launch_cad_software_with_path(&cad_path, &local_file_path).await {
        Ok(()) => CADResult {
            success: true,
            message: "CAD文件已打开".to_string(),
            software: Some(cad_path),
            error: None,
        },
        Err(err) => CADResult {
            success: false,
            message: format!("打开CAD文件失败: {}", err),
            software: Some(cad_path),
            error: Some(err),
        }
    }
}

// 使用指定路径启动CAD软件
async fn launch_cad_software_with_path(cad_path: &str, file_path: &str) -> Result<(), String> {
    println!("启动CAD软件: {} 打开文件: {}", cad_path, file_path);
    
    #[cfg(target_os = "windows")]
    {
        println!("Windows环境: 启动 {} 打开文件 {}", cad_path, file_path);
        let mut cmd = Command::new(cad_path);
        cmd.arg(file_path);
        
        cmd.spawn()
            .map_err(|e| format!("Windows启动软件失败: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        println!("macOS环境: 启动 {} 打开文件 {}", cad_path, file_path);
        
        if cad_path.ends_with(".app") {
            // 对于.app应用程序，有多种启动方式
            // 方式1: 先启动应用，再通过AppleScript打开文件
            if cad_path.contains("AutoCAD") {
                println!("检测到AutoCAD，使用特殊启动方式");
                
                // 首先启动AutoCAD应用
                let mut launch_cmd = Command::new("open");
                launch_cmd.arg("-a").arg(cad_path);
                
                match launch_cmd.spawn() {
                    Ok(_) => {
                        println!("AutoCAD应用已启动，等待2秒后打开文件...");
                        // 等待应用启动
                        std::thread::sleep(std::time::Duration::from_secs(2));
                        
                        // 方式A: 使用AppleScript直接让AutoCAD打开文件
                        // 从.app路径中提取应用名称
                        let app_name = if let Some(name) = std::path::Path::new(cad_path)
                            .file_stem()
                            .and_then(|s| s.to_str()) {
                            name.to_string()
                        } else {
                            "AutoCAD 2026".to_string() // 默认名称
                        };
                        
                        let applescript = format!(
                            r#"tell application "{}"
                                activate
                                open POSIX file "{}"
                            end tell"#,
                            app_name,
                            file_path
                        );
                        
                        println!("执行AppleScript，应用名称: {}", app_name);
                        
                        let mut script_cmd = Command::new("osascript");
                        script_cmd.arg("-e").arg(&applescript);
                        
                        match script_cmd.spawn() {
                            Ok(_) => println!("AppleScript命令已发送"),
                            Err(e) => {
                                println!("AppleScript失败: {}, 尝试备用方法", e);
                                
                                // 备用方式B: 直接用open命令打开文件（让系统关联）
                                let mut open_file_cmd = Command::new("open");
                                open_file_cmd.arg(file_path);
                                
                                open_file_cmd.spawn()
                                    .map_err(|e| format!("备用方法启动失败: {}", e))?;
                            }
                        }
                    }
                    Err(e) => {
                        println!("启动AutoCAD失败: {}, 尝试直接打开文件", e);
                        
                        // 如果应用启动失败，直接用open命令打开文件
                        let mut open_file_cmd = Command::new("open");
                        open_file_cmd.arg("-a").arg(cad_path).arg(file_path);
                        
                        open_file_cmd.spawn()
                            .map_err(|e| format!("直接打开文件失败: {}", e))?;
                    }
                }
            } else {
                // 对于其他CAD软件，使用标准方式
                let mut cmd = Command::new("open");
                cmd.arg("-a").arg(cad_path).arg(file_path);
                
                println!("标准macOS命令: open -a {} {}", cad_path, file_path);
                
                cmd.spawn()
                    .map_err(|e| format!("标准启动失败: {}", e))?;
            }
        } else {
            // 对于可执行文件
            if std::path::Path::new(cad_path).exists() {
                let mut cmd = Command::new(cad_path);
                cmd.arg(file_path);
                
                println!("可执行文件命令: {} {}", cad_path, file_path);
                
                cmd.spawn()
                    .map_err(|e| format!("可执行文件启动失败: {}", e))?;
            } else {
                // 否则用open命令打开文件
                let mut cmd = Command::new("open");
                cmd.arg(file_path);
                
                println!("系统默认打开: open {}", file_path);
                
                cmd.spawn()
                    .map_err(|e| format!("系统默认打开失败: {}", e))?;
            }
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        let mut cmd = Command::new(cad_path);
        cmd.arg(file_path);
        
        cmd.spawn()
            .map_err(|e| format!("启动软件失败: {}", e))?;
    }
    
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            detect_cad_software,
            open_cad_file,
            open_cad_file_with_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}