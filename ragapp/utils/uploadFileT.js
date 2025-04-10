// @/utils/uploadFile.js
export function chooseFile(callback, acceptType = "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document", name = "1", index = 3) {
    // 检查 plus 环境
    if (!window.plus || !plus.android || !plus.os.name === 'Android') {
        console.warn("当前环境不支持 plus API 或非 Android 平台");
        callback({ code: 500, msg: "仅支持 Android 平台的 plus 环境" });
        return;
    }

    const CODE_REQUEST = 1000;
    let main;
    try {
        main = plus.android.runtimeMainActivity();
    } catch (e) {
        console.error("获取 Activity 失败:", e);
        callback({ code: 500, msg: "无法初始化 Activity" });
        return;
    }

    console.log("开始文件选择流程");

    try {
        const Intent = plus.android.importClass('android.content.Intent');
        const intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);

        // 设置 MIME 类型，增加兼容性
        intent.setType("*/*"); // 默认通配符
        if (acceptType) {
            const mimeTypes = acceptType.split(",");
            intent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes);
            intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false); // 单选文件
        }

        // 使用 plus.android.requestPermissions 确保权限
        plus.android.requestPermissions(
            ['android.permission.READ_EXTERNAL_STORAGE'],
            (result) => {
                if (result === 0) {
                    console.log("权限已授予，开始选择文件");
                    startFileChooser(main, intent, CODE_REQUEST, callback, name, index);
                } else {
                    console.warn("存储权限被拒绝");
                    callback({ code: 500, msg: "需要存储权限以选择文件" });
                }
            },
            (error) => {
                console.error("权限请求失败:", error);
                callback({ code: 500, msg: "权限请求失败" });
            }
        );
    } catch (e) {
        console.error("初始化文件选择器失败:", e);
        callback({ code: 500, msg: "文件选择初始化失败" });
    }
}

function startFileChooser(main, intent, requestCode, callback, name, index) {
    // 重置 onActivityResult，避免被覆盖
    main.onActivityResult = null;

    main.onActivityResult = (reqCode, resCode, data) => {
        try {
            if (reqCode === requestCode && resCode === main.RESULT_OK && data) {
                const uri = data.getData();
                if (!uri) {
                    callback({ code: 500, msg: "无法获取文件 URI" });
                    return;
                }

                console.log("选择的文件 URI:", uri.toString());

                const filePath = resolveFilePath(main, uri);
                if (!filePath) {
                    callback({ code: 500, msg: "无法解析文件路径" });
                    return;
                }

                const lowerPath = filePath.toLowerCase();
                if (lowerPath.endsWith('.pdf') || lowerPath.endsWith('.doc') || lowerPath.endsWith('.docx')) {
                    const fileSize = getFileSize(filePath);
                    const fileUrl = "file://" + filePath;

                    const result = {
                        file: [{
                            size: fileSize,
                            type: lowerPath.endsWith(".pdf") ? "application/pdf" :
                                  lowerPath.endsWith(".doc") ? "application/msword" :
                                  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                            url: fileUrl,
                            thumb: fileUrl
                        }],
                        name,
                        index
                    };
                    callback({ code: 200, msg: "success", data: result });
                } else {
                    callback({ code: 500, msg: "选择的文件不是 PDF、DOC 或 DOCX" });
                }
            } else {
                callback({ code: 500, msg: "文件选择取消或失败" });
            }
        } catch (e) {
            console.error("处理文件选择结果失败:", e);
            callback({ code: 500, msg: "文件处理失败", error: e.message });
        }
    };

    try {
        main.startActivityForResult(intent, requestCode);
    } catch (e) {
        console.error("启动文件选择器失败:", e);
        callback({ code: 500, msg: "无法启动文件选择器" });
    }
}

function resolveFilePath(main, uri) {
    try {
        const Build = plus.android.importClass('android.os.Build');
        const DocumentsContract = plus.android.importClass('android.provider.DocumentsContract');
        const isKitKat = Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT;

        plus.android.importClass(uri);

        if (isKitKat && DocumentsContract.isDocumentUri(main, uri)) {
            const docId = DocumentsContract.getDocumentId(uri);
            const split = docId.split(":");
            const authority = uri.getAuthority();

            if ("com.android.externalstorage.documents" === authority) {
                const type = split[0];
                const Environment = plus.android.importClass('android.os.Environment');
                return type === "primary" ?
                    Environment.getExternalStorageDirectory() + "/" + split[1] :
                    "/storage/sdcard0/" + split[1]; // 备用路径
            } else if ("com.android.providers.downloads.documents" === authority) {
                const ContentUris = plus.android.importClass('android.content.ContentUris');
                const Uri = plus.android.importClass('android.net.Uri');
                const contentUri = ContentUris.withAppendedId(Uri.parse("content://downloads/public_downloads"), parseInt(docId));
                return getDataColumn(main, contentUri, null, null);
            } else if ("com.android.providers.media.documents" === authority) {
                const MediaStore = plus.android.importClass('android.provider.MediaStore');
                const type = split[0];
                let contentUri = MediaStore.Files.getContentUri("external");
                return getDataColumn(main, contentUri, "_id=?", [split[1]]);
            }
        } else if ("content" === uri.getScheme()) {
            return getDataColumn(main, uri, null, null);
        } else if ("file" === uri.getScheme()) {
            return uri.getPath();
        }
        return null;
    } catch (e) {
        console.error("解析文件路径失败:", e);
        return null;
    }
}

function getDataColumn(main, uri, selection, selectionArgs) {
    try {
        const cursor = main.getContentResolver().query(uri, ['_data'], selection, selectionArgs, null);
        if (cursor && cursor.moveToFirst()) {
            const columnIndex = cursor.getColumnIndexOrThrow('_data');
            const result = cursor.getString(columnIndex);
            cursor.close();
            return result;
        }
        return null;
    } catch (e) {
        console.error("获取文件路径列失败:", e);
        return null;
    }
}

function getFileSize(filePath) {
    try {
        const File = plus.android.importClass('java.io.File');
        const file = new File(filePath);
        return file.exists() ? file.length() : 0;
    } catch (e) {
        console.error("获取文件大小失败:", e);
        return 0;
    }
}

export default chooseFile;