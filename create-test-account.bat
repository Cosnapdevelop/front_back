@echo off
chcp 65001 >nul
title Cosnap测试账号创建工具

echo.
echo ===============================================
echo    🎯 Cosnap测试账号创建工具
echo ===============================================
echo.

echo 📋 即将创建VIP测试账号...
echo    邮箱: test@cosnap.dev
echo    等级: VIP (无限AI特效使用)
echo    有效期: 1年
echo.

echo ⏳ 正在创建账号，请稍候...
echo.

REM 使用curl创建测试账号
curl -X POST "https://cosnap-back.onrender.com/api/admin/test-user" ^
  -H "x-admin-key: cosnap-test-admin-2024-secure-key" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\": \"test@cosnap.dev\", \"tier\": \"VIP\"}" ^
  --silent --show-error --fail

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ 测试账号创建成功！
    echo.
    echo 🎉 下一步:
    echo    1. 访问 https://cosnap.vercel.app/
    echo    2. 使用邮箱 test@cosnap.dev 登录
    echo    3. 现在可以无限制使用AI特效了！
    echo.
) else (
    echo.
    echo ❌ 创建失败，可能的原因：
    echo    - 网络连接问题
    echo    - 服务器暂时离线
    echo    - curl命令未安装
    echo.
    echo 💡 备用方案：
    echo    1. 安装Postman并手动发送请求
    echo    2. 或者联系技术支持
    echo.
    
    REM 尝试使用PowerShell作为备用方案
    echo ⏳ 尝试使用PowerShell备用方案...
    powershell -Command "try { $response = Invoke-RestMethod -Uri 'https://cosnap-back.onrender.com/api/admin/test-user' -Method Post -Headers @{'x-admin-key'='cosnap-test-admin-2024-secure-key'; 'Content-Type'='application/json'} -Body '{\"email\": \"test@cosnap.dev\", \"tier\": \"VIP\"}'; Write-Host '✅ 使用PowerShell创建成功！'; Write-Host '邮箱: test@cosnap.dev'; Write-Host '等级: VIP'; Write-Host '🎉 现在可以登录 https://cosnap.vercel.app/ 使用无限AI特效了！' } catch { Write-Host '❌ PowerShell方案也失败了，请联系技术支持' }"
)

echo.
echo ===============================================
echo 按任意键退出...
pause >nul