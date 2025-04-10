export function uploadFileNative(fileUrl) {
    // 检查 plus 环境
    if (!window.plus || !plus.android) {
        console.error("此功能需要在 plus 环境下运行");
       
        uni.showToast({
           title: '环境不对',
           icon: 'none',
           duration: 2000
         });
    }

    // 清理 fileUrl，去掉 file:// 前缀（如果有）
    
    console.log("准备上传的文件路径:", filePath);

    // 导入 Android 原生类
    const HttpURLConnection = plus.android.importClass("java.net.HttpURLConnection");
    const URL = plus.android.importClass("java.net.URL");
    const File = plus.android.importClass("java.io.File");
    const FileInputStream = plus.android.importClass("java.io.FileInputStream");
    const DataOutputStream = plus.android.importClass("java.io.DataOutputStream");
    const BufferedReader = plus.android.importClass("java.io.BufferedReader");
    const InputStreamReader = plus.android.importClass("java.io.InputStreamReader");

    // 定义上传参数
    const uploadUrl = "http://118.31.113.55:8083/updateFiles";
    const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"; // multipart 分隔符
    const fieldName = "file"; // 服务器期望的字段名

    // 检查文件是否存在
    const file = new File(filePath);
    if (!file.exists()) {
        console.error("文件不存在:", filePath);
        uni.showToast({
           title: '文件不存在',
           icon: 'none',
           duration: 2000
         });
        return;
    }

    try {
        // 创建 URL 和连接
        const url = new URL(uploadUrl);
        const connection = url.openConnection();
        plus.android.importClass(connection);
        connection.setRequestMethod("POST");
        connection.setDoOutput(true);
        connection.setDoInput(true);
        connection.setUseCaches(false);
        connection.setRequestProperty("Connection", "Keep-Alive");
        connection.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);

        // 创建输出流
        const outputStream = new DataOutputStream(connection.getOutputStream());

        // 写入 multipart 数据
        const fileName = file.getName();
        outputStream.writeBytes(`--${boundary}\r\n`);
        outputStream.writeBytes(`Content-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\n`);
        outputStream.writeBytes("Content-Type: application/octet-stream\r\n\r\n");

        // 读取文件并写入流
        const fileInputStream = new FileInputStream(file);
        const buffer = new plus.android.newObject("byte[]", 1024); // 1KB 缓冲区
        let bytesRead;
        while ((bytesRead = fileInputStream.read(buffer)) !== -1) {
            outputStream.write(buffer, 0, bytesRead);
        }
        fileInputStream.close();

        // 结束 multipart
        outputStream.writeBytes("\r\n");
        outputStream.writeBytes(`--${boundary}--\r\n`);
        outputStream.flush();
        outputStream.close();

        // 获取响应
        const responseCode = connection.getResponseCode();
        console.log("服务器响应码:", responseCode);

        let responseData = "";
        if (responseCode === 200) {
            const inputStream = connection.getInputStream();
            const reader = new BufferedReader(new InputStreamReader(inputStream));
            let line;
            while ((line = reader.readLine()) !== null) {
                responseData += line;
            }
            reader.close();
            inputStream.close();
        } else {
            const errorStream = connection.getErrorStream();
            if (errorStream) {
                const errorReader = new BufferedReader(new InputStreamReader(errorStream));
                let errorLine;
                while ((errorLine = errorReader.readLine()) !== null) {
                    responseData += errorLine;
                }
                errorReader.close();
                errorStream.close();
            }
        }

        connection.disconnect();

        // 返回结果
        if (responseCode === 200) {
            console.log("上传成功，返回数据:", responseData);
            uni.showToast({
               title: '上传成功',
               icon: 'none',
               duration: 2000
             });
        } else {
            console.error("上传失败，响应码:", responseCode, "数据:", responseData);
            uni.showToast({
               title: '上传失败',
               icon: 'none',
               duration: 2000
             });
        }
    } catch (e) {
        console.error("原生上传异常:", e);
        uni.showToast({
           title: '原生上传异常',
           icon: 'none',
           duration: 2000
         });
    }
}

export default uploadFileNative;