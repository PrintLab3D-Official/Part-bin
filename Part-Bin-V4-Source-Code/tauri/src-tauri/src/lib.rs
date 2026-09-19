// Windows flag so spawned processes never pop up a console window.
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Fully stop the local Ollama so nothing runs in the background.
#[tauri::command]
fn stop_ollama() -> Result<String, String> {
  use std::process::Command;
  #[cfg(target_os = "windows")]
  {
    use std::os::windows::process::CommandExt;
    // Kill the tray app and the server process (ignore "not found").
    let _ = Command::new("taskkill").args(["/F", "/IM", "ollama app.exe"]).creation_flags(CREATE_NO_WINDOW).output();
    let _ = Command::new("taskkill").args(["/F", "/IM", "ollama.exe"]).creation_flags(CREATE_NO_WINDOW).output();
    Ok("stopped".into())
  }
  #[cfg(not(target_os = "windows"))]
  {
    let _ = Command::new("pkill").args(["-f", "ollama"]).output();
    Ok("stopped".into())
  }
}

/// Start the local Ollama server (headless) so the API actually comes online.
#[tauri::command]
fn start_ollama() -> Result<String, String> {
  use std::process::Command;
  #[cfg(target_os = "windows")]
  {
    use std::os::windows::process::CommandExt;
    // DETACHED_PROCESS + CREATE_NO_WINDOW: no console, survives app close.
    const DETACHED_PROCESS: u32 = 0x0000_0008;
    let flags = CREATE_NO_WINDOW | DETACHED_PROCESS;
    let mut last = String::new();
    // Prefer running the server binary directly at its install path.
    if let Some(local) = std::env::var_os("LOCALAPPDATA") {
      let srv = std::path::Path::new(&local).join("Programs").join("Ollama").join("ollama.exe");
      if srv.exists() {
        match Command::new(&srv).arg("serve").creation_flags(flags).spawn() {
          Ok(_) => return Ok("started".into()),
          Err(e) => last = e.to_string(),
        }
      }
    }
    // Fallback: rely on PATH.
    match Command::new("ollama").arg("serve").creation_flags(flags).spawn() {
      Ok(_) => Ok("started".into()),
      Err(e) => Err(format!("Could not start Ollama ({}). Is it installed?", if last.is_empty() { e.to_string() } else { last })),
    }
  }
  #[cfg(not(target_os = "windows"))]
  {
    Command::new("ollama").arg("serve").spawn().map_err(|e| e.to_string())?;
    Ok("started".into())
  }
}

/// Read a text file the user explicitly picked in the native dialog.
/// Done in Rust so we don't need the fs plugin's path-scope config.
#[tauri::command]
fn read_text_file_abs(path: String) -> Result<String, String> {
  std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// Read the first sheet of a spreadsheet (.xlsx/.xls/.ods) as rows of strings,
/// so EasyEDA-style BOMs import without a "Save As CSV" step.
#[tauri::command]
fn read_spreadsheet(path: String) -> Result<Vec<Vec<String>>, String> {
  use calamine::{open_workbook_auto, Reader, DataType};
  let mut wb = open_workbook_auto(&path).map_err(|e| e.to_string())?;
  let name = wb.sheet_names().first().cloned().ok_or_else(|| "The file has no sheets".to_string())?;
  let range = wb.worksheet_range(&name).map_err(|e| e.to_string())?;
  let mut out: Vec<Vec<String>> = Vec::new();
  for row in range.rows() {
    let cells: Vec<String> = row.iter().map(|c| {
      if c.is_empty() { String::new() }
      else if let Some(s) = c.get_string() { s.to_string() }
      else if let Some(f) = c.get_float() { if f.fract() == 0.0 { (f as i64).to_string() } else { f.to_string() } }
      else if let Some(i) = c.get_int() { i.to_string() }
      else if let Some(b) = c.get_bool() { b.to_string() }
      else { c.to_string() }
    }).collect();
    out.push(cells);
  }
  Ok(out)
}

/// The user's Downloads folder, so the file dialog can open there by default.
#[tauri::command]
fn downloads_dir() -> Option<String> {
  #[cfg(target_os = "windows")]
  let base = std::env::var_os("USERPROFILE");
  #[cfg(not(target_os = "windows"))]
  let base = std::env::var_os("HOME");
  base.map(|h| std::path::Path::new(&h).join("Downloads").to_string_lossy().to_string())
}

/// Write label HTML to a temp file and open it in the default browser so it can
/// be printed. Needed on macOS, where the WKWebView engine ignores the
/// JavaScript `window.print()` that works fine on Windows' WebView2.
#[tauri::command]
fn print_html(html: String) -> Result<String, String> {
  let mut path = std::env::temp_dir();
  path.push("parts-bin-labels.html");
  std::fs::write(&path, html).map_err(|e| e.to_string())?;
  let p = path.to_string_lossy().to_string();
  #[cfg(target_os = "macos")]
  {
    std::process::Command::new("open").arg(&p).spawn().map_err(|e| e.to_string())?;
  }
  #[cfg(target_os = "windows")]
  {
    use std::os::windows::process::CommandExt;
    let _ = std::process::Command::new("cmd").args(["/C", "start", "", &p]).creation_flags(CREATE_NO_WINDOW).spawn();
  }
  #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
  {
    let _ = std::process::Command::new("xdg-open").arg(&p).spawn();
  }
  Ok(p)
}


/// ---------------------------------------------------------------------
/// PIN reset: prove the person at the keyboard is the signed-in Windows user.
/// Windows Hello does it (the "Verify it's you" dialog: PIN, face, fingerprint). The app never
/// sees a password and nothing is stored or logged.
/// On other platforms these report "unavailable" and the lock screen hides the button.
/// ---------------------------------------------------------------------

/// Is Windows Hello set up on this PC?
/// NOTE: all three are `async` on purpose. Tauri runs plain commands on the main (UI) thread,
/// and these block while Windows shows a dialog that needs that thread alive. Blocking it
/// deadlocks the app (Windows reports "stopped responding" and closes it).
#[tauri::command]
async fn pin_hello_available() -> bool {
  #[cfg(target_os = "windows")]
  {
    use windows::Security::Credentials::UI::{UserConsentVerifier, UserConsentVerifierAvailability};
    let r = tauri::async_runtime::spawn_blocking(|| -> bool {
      unsafe { let _ = windows::Win32::System::WinRT::RoInitialize(windows::Win32::System::WinRT::RO_INIT_MULTITHREADED); }
      UserConsentVerifier::CheckAvailabilityAsync()
        .and_then(|op| op.get())
        .map(|a| a == UserConsentVerifierAvailability::Available)
        .unwrap_or(false)
    }).await.unwrap_or(false);
    return r;
  }
  #[allow(unreachable_code)]
  false
}

/// Show the Windows Hello dialog. Returns "verified", "cancelled", "unavailable" or "failed".
#[tauri::command]
async fn pin_verify_hello(window: tauri::WebviewWindow) -> Result<String, String> {
  #[cfg(target_os = "windows")]
  {
    use windows::core::HSTRING;
    use windows_future::IAsyncOperation;
    use windows::Security::Credentials::UI::{UserConsentVerifier, UserConsentVerificationResult};
    use windows::Win32::Foundation::HWND;
    use windows::Win32::System::WinRT::{IUserConsentVerifierInterop, RoInitialize, RO_INIT_MULTITHREADED};
    // HWND as a plain integer so it can cross into the worker thread.
    let hwnd: isize = window.hwnd().map(|h| h.0 as isize).map_err(|e| e.to_string())?;
    let r = tauri::async_runtime::spawn_blocking(move || -> String {
      unsafe { let _ = RoInitialize(RO_INIT_MULTITHREADED); }
      let interop: IUserConsentVerifierInterop = match windows::core::factory::<UserConsentVerifier, IUserConsentVerifierInterop>() {
        Ok(f) => f, Err(_) => return "unavailable".into(),
      };
      let msg = HSTRING::from("Parts Bin: confirm it's you to remove the PIN lock");
      let op: IAsyncOperation<UserConsentVerificationResult> = match unsafe { interop.RequestVerificationForWindowAsync(HWND(hwnd as *mut _), &msg) } {
        Ok(o) => o, Err(_) => return "unavailable".into(),
      };
      match op.get() {
        Ok(UserConsentVerificationResult::Verified) => "verified".into(),
        Ok(UserConsentVerificationResult::Canceled) => "cancelled".into(),
        Ok(UserConsentVerificationResult::DeviceNotPresent)
        | Ok(UserConsentVerificationResult::NotConfiguredForUser)
        | Ok(UserConsentVerificationResult::DisabledByPolicy) => "unavailable".into(),
        Ok(_) => "failed".into(),
        Err(_) => "unavailable".into(),
      }
    }).await.unwrap_or_else(|_| "failed".into());
    return Ok(r);
  }
  #[allow(unreachable_code)]
  Ok("unavailable".into())
}

/// ---------------------------------------------------------------------
/// Startup safety net (the "black screen on launch" fix).
/// The window is created hidden (tauri.conf.json `visible: false`) so the user
/// never sees an unpainted black/white frame while WebView2 is still starting.
/// The frontend calls `app_ready` right after its first render and only then is
/// the window shown. If that call never comes (webview stalled, script error
/// before the boot line), a fallback thread shows the window anyway after a few
/// seconds and, once, reloads the webview so a one-off stall recovers itself.
/// ---------------------------------------------------------------------
static APP_READY: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

fn show_main(app: &tauri::AppHandle) {
  use tauri::Manager;
  if let Some(w) = app.get_webview_window("main") {
    let _ = w.show();
    let _ = w.set_focus();
  }
}

/// The frontend has painted its first frame: show the window.
#[tauri::command]
fn app_ready(app: tauri::AppHandle) {
  APP_READY.store(true, std::sync::atomic::Ordering::SeqCst);
  show_main(&app);
}

/// Open the folder that holds the app's data (WebView2 storage) in the file manager.
/// Used by the recovery screen so a stuck user can still reach their data.
#[tauri::command]
fn open_data_dir(app: tauri::AppHandle) -> Result<String, String> {
  use tauri::Manager;
  let dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
  let p = dir.to_string_lossy().to_string();
  #[cfg(target_os = "windows")]
  {
    use std::os::windows::process::CommandExt;
    let _ = std::process::Command::new("explorer").arg(&p).creation_flags(CREATE_NO_WINDOW).spawn();
  }
  #[cfg(target_os = "macos")]
  { let _ = std::process::Command::new("open").arg(&p).spawn(); }
  #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
  { let _ = std::process::Command::new("xdg-open").arg(&p).spawn(); }
  Ok(p)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_notification::init())
    .invoke_handler(tauri::generate_handler![stop_ollama, start_ollama, read_text_file_abs, downloads_dir, read_spreadsheet, print_html, pin_hello_available, pin_verify_hello, app_ready, open_data_dir])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      // Startup fallback: never leave the window hidden, never leave a stalled webview alone.
      let h = app.handle().clone();
      std::thread::spawn(move || {
        use std::sync::atomic::Ordering;
        use tauri::Manager;
        std::thread::sleep(std::time::Duration::from_millis(4000));
        if !APP_READY.load(Ordering::SeqCst) { show_main(&h); }
        std::thread::sleep(std::time::Duration::from_millis(8000));
        if !APP_READY.load(Ordering::SeqCst) {
          // 12 s with no first paint: reload the page once. A stalled WebView2
          // usually comes good on a second navigation; a real script error just
          // lands on the in-page recovery screen again, so this cannot loop.
          if let Some(w) = h.get_webview_window("main") { let _ = w.eval("location.reload()"); }
        }
      });
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
