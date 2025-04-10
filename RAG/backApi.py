from flask import Flask,request,jsonify
import os
import random
import time
import mysql.connector
import requests
import json
from flask_cors import CORS
from main import process_filelist,chunkize_text,store_vectorstore,add_vectortsore,query

userRepository_path = "userRepository"
userVectorRepository_path = "userVectorRepository"
baseVectorRepository_path = "baseVectorRepository"
def store_files(file_list,repository):
    file_list = [os.path.join(repository,file) for file in file_list]
app = Flask(__name__)

# "http://localhost:8080","http://localhost:8082","http://192.168.2.15:8080"

CORS(app, supports_credentials=True)

conn = mysql.connector.connect(
        host="118.31.113.55",
        port="3306",
        user="tingz",
        password="123456",
        database="content"
    )
@app.route("/init")
def initUser():

    cursor = conn.cursor()
    cursor.execute("INSERT INTO User (vectorname) VALUES (%s)", (None,))
    conn.commit()
    id = cursor.lastrowid

    cursor.close()
    response = app.make_response("success")
    response.set_cookie(
        "id", str(id),
        domain="127.0.0.1:8083", 
        httponly=False,  # 如果是 True，JavaScript 无法访问
       secure=True, samesite='None')
    return response



@app.route("/updateFiles", methods=['POST'])
def uploadFiles():
    first_update = 1
    vectorname = None
    
    with conn.cursor() as cursor:
        ##  提取参数
        id = request.cookies.get('id')
        if not id:
            return "Username cookie not found", 400
        file = request.files.get("file")
        print(file)
        if not file:
            return "No file selected", 400
        files = [file]
        
        ## 判断id是否存在  
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM User WHERE id = %s", (id,))
        result = cursor.fetchone()
        print("result::::::")
        print(result)
        if result is None:
            return "userid not found", 404

        ## 检查是否是首次更新
        if result[1] != None:
            first_update = 0 
            vectorname = result[1]
        
        ## 储存文件
        file_map_list = []
        for file in files:
            if file.filename == '' or file.filename.split(".")[-1] != "pdf":
                return "One of the files that is not .pdf or has no filename", 400
            file_map_list.append({})
            filename = str(time.time()*1000) + "_" + str(random.randint(1000, 9999)) + "_" + file.filename
            file_map_list[-1][file.filename] = filename
            # Save the file to the desired location
            file.save(f"{os.path.join(userRepository_path,filename)}")
        
        ## 文件分块
        file_list = [os.path.join(userRepository_path,list(file_map.values())[0]) for file_map in file_map_list]
        page_list = process_filelist(file_list)
        chunks = chunkize_text(page_list)

        ## 向量储存或向量更新
            # 向量储存
        if first_update == 1 :
            vectorname = store_vectorstore(chunks,userVectorRepository_path)
            cursor.execute("UPDATE User SET vectorname = %s WHERE id = %s", (vectorname, id))
            conn.commit()
            # 向量更新
        if first_update == 0 :
            print("addaddddddddddd")
            print(vectorname)
            add_vectortsore(chunks,vectorname,userVectorRepository_path)
        for file_map in file_map_list:
            cursor.execute("INSERT INTO files (userid, filename, filesrc) VALUES (%s, %s, %s)", (id, list(file_map.keys())[0], list(file_map.values())[0]))
            conn.commit()
    response = app.make_response("success")
    return response

@app.route("/query",methods=["GET"])         
def queryQuestion():
    '''
    params:
        id question broad_num 
    return:
         {
          "answer" : ""
          "references": [
            ["title of article" : str, page_num : int]
            ……

            ]
         }

    '''
    with conn.cursor() as cursor:
        ## 提取参数
        id = request.cookies.get('id')
        if not id:
            return "Username cookie not found", 400
        
        question = request.args.get('question')
        if not question:
            return "Question parameter is missing", 400
        
        broad_num = request.args.get('broad_num')
        if not broad_num:
            return "Question parameter is missing", 400
        broad_num = int(broad_num)
        vectorname = None

        ## 判断id是否存在
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM User WHERE id = %s", (id,))
        result = cursor.fetchone()
        if result is None:
            return "userid not found", 40
         
        ## 检查是否存在向量库
        if result[1] != None:
            vectorname = result[1]
            
        ## 查询问题
            # 查询用户向量库
        if vectorname:
            answer = query(question,vectorname,userVectorRepository_path,broad_num)
            # 查询base向量库
        else:
            answer = query(question,"vectorstore_1742813599.6693869_95",baseVectorRepository_path,broad_num)

        ## 处理问题
        answer["references"] = [ [metadata["title"], int(metadata["page"])] for metadata in answer["references"] ]
        return app.response_class(response=json.dumps(answer), status=200, mimetype='application/json')

        

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8083)

