export function chooseFile(callback, acceptType = "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document", name = "1", index = 3) {
    var CODE_REQUEST = 1000;
    var main = plus.android.runtimeMainActivity();
    if (plus.os.name == 'Android') {
        console.log("666");
        var Intent = plus.android.importClass('android.content.Intent');
        var intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
 
        // Set acceptType to allow pdf, doc, and docx files
        if (acceptType) {
            intent.setType(acceptType);
            intent.putExtra(Intent.EXTRA_MIME_TYPES, acceptType.split(","));
        } else {
            intent.setType("*/*");
        }
 
        main.onActivityResult = (requestCode, resultCode, data) => {
            if (requestCode == CODE_REQUEST && resultCode == main.RESULT_OK) {
                const uri = data.getData();
                plus.android.importClass(uri);
                const Build = plus.android.importClass('android.os.Build');
                const isKitKat = Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT;
                const DocumentsContract = plus.android.importClass('android.provider.DocumentsContract');
 
                let filePath = null;
 
                if (isKitKat && DocumentsContract.isDocumentUri(main, uri)) {
                    if ("com.android.externalstorage.documents" == uri.getAuthority()) {
                        var docId = DocumentsContract.getDocumentId(uri);
                        var split = docId.split(":");
                        var type = split[0];
 
                        if ("primary" == type) {
                            var Environment = plus.android.importClass('android.os.Environment');
                            filePath = Environment.getExternalStorageDirectory() + "/" + split[1];
                        } else {
                            var System = plus.android.importClass('java.lang.System');
                            var sdPath = System.getenv("SECONDARY_STORAGE");
                            if (sdPath) {
                                filePath = sdPath + "/" + split[1];
                            }
                        }
                    } else if ("com.android.providers.downloads.documents" == uri.getAuthority()) {
                        var id = DocumentsContract.getDocumentId(uri);
                        var ContentUris = plus.android.importClass('android.content.ContentUris');
                        var contentUri = ContentUris.withAppendedId(
                            Uri.parse("content://downloads/public_downloads"), id);
                        filePath = getDataColumn(main, contentUri, null, null);
                    } else if ("com.android.providers.media.documents" == uri.getAuthority()) {
                        var docId = DocumentsContract.getDocumentId(uri);
                        var split = docId.split(":");
                        var type = split[0];
                        var MediaStore = plus.android.importClass('android.provider.MediaStore');
 
                        if ("image" == type) {
                            contentUri = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
                        } else if ("video" == type) {
                            contentUri = MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
                        } else if ("audio" == type) {
                            contentUri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
                        } else {
                            contentUri = MediaStore.Files.getContentUri("external");
                        }
 
                        var selection = "_id=?";
                        var selectionArgs = new Array();
                        selectionArgs[0] = split[1];
 
                        filePath = getDataColumn(main, contentUri, selection, selectionArgs);
                    }
                } else if ("content" == uri.getScheme()) {
                    filePath = getDataColumn(main, uri, null, null);
                } else if ("file" == uri.getScheme()) {
                    filePath = uri.getPath();
                }
 
                // Ensure file is either PDF, DOC, or DOCX before proceeding
                if (filePath && (filePath.toLowerCase().endsWith('.pdf') || filePath.toLowerCase().endsWith('.doc') || filePath.toLowerCase().endsWith('.docx'))) {
                    const fileSize = getFileSize(filePath); // Function to get file size
                    const fileUrl = "file://" + filePath;
 
                    const result = {
                        "file": [
                            {
                                "size": fileSize,
                                "type": "application/" + (filePath.endsWith(".pdf") ? "pdf" : (filePath.endsWith(".doc") ? "msword" : "vnd.openxmlformats-officedocument.wordprocessingml.document")),
                                "url": fileUrl,
                                "thumb": filePath // Assuming thumb is the same as URL
                            }
                        ],
                        "name": name,
                        "index": index
                    };
                    callback({ code: 200, msg: "success", data: result });
                } else {
                    callback({ msg: "Selected file is not a valid PDF, DOC, or DOCX file.", code: 500 });
                    console.error("Selected file is not a valid PDF, DOC, or DOCX file.");
                }
            }
        };
        main.startActivityForResult(intent, CODE_REQUEST);
    }
}
 
function getDataColumn(main, uri, selection, selectionArgs) {
    plus.android.importClass(main.getContentResolver());
    let cursor = main.getContentResolver().query(uri, ['_data'], selection, selectionArgs, null);
    plus.android.importClass(cursor);
    if (cursor != null && cursor.moveToFirst()) {
        var column_index = cursor.getColumnIndexOrThrow('_data');
        var result = cursor.getString(column_index);
        cursor.close();
        return result;
    }
	uni.showModal({
	  title: "提示",
	  content: "请从文件选择器下选择Download目录下pdf文件" ,
	  showCancel: false,
	  confirmText: "确定"
	});
    return null;
}
 
function getFileSize(filePath) {
    var File = plus.android.importClass('java.io.File');
    var file = new File(filePath);
    return file.length(); // Returns the size in bytes
}
 
export default chooseFile;