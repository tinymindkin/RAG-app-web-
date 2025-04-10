from langchain.document_loaders import TextLoader
from langchain.schema import Document
import os
import fitz  # PyMuPDF
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import CharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.output_parsers import StrOutputParser
from langchain_core.documents import Document as DocumentCore
from langchain.chains import create_retrieval_chain
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
import hashlib
import time
import random



#set openai key
baseRepository_path = 'baseRepository'
vectorRepository_path = 'baseVectorRepository'

# 读取 PDF
######### 将directiory中的文件提取文本
def file_extract_text(file_path) -> list[Document]:

    loader = PyPDFLoader(file_path)
    pages = loader.load_and_split()
    try:
        doc_title = pages[0].page_content.split("Abstract")[0].repalce("\n","")
    except:
        doc_title = "".join(pages[0].page_content.split("\n")[:3])
    for page in pages:
        page.metadata["title"] = doc_title
    return pages

def traverse_directory(directory) -> list:
    file_list = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            file_list.append(os.path.join(root, file))
    return file_list

def process_Repository(Repository_path) -> list[Document]:
    file_list = traverse_directory(Repository_path) 
    page_list = []
    for file in file_list:
        page_list.extend(file_extract_text(file))
    return page_list
def process_filelist(file_list) -> list[Document]:
    '''
    params: 
        file_list : ["./repository/filename",]
    return :
        list[Document]
    '''
    page_list = []
    for file in file_list:
        page_list.extend(file_extract_text(file))
    return page_list
##########

def chunkize_text(page_list : list[Document]) -> list[Document]:
    text_splitter = CharacterTextSplitter(
                chunk_size=5000, 
                chunk_overlap=1000,
                keep_separator=True)

    chunks = text_splitter.split_documents(page_list)
    return chunks




def store_vectorstore(chunks, repositry) -> str:
    # my_credentials = weaviate.AuthClientPassword("test@2024.com", "test-secret-key")
    
#     client = weaviate.connect_to_custom(
#     http_host="118.31.113.55",
#     http_port=8080,
#     http_secure = False,
#     grpc_host = "118.31.113.55",
#     grpc_port = 50051,
#     grpc_secure = False,
#     auth_credentials=weaviate.classes.init.Auth.api_key("test-secret-key"),  # 使用 API Key
# )
    
    vectorstore = FAISS.from_documents(
        documents=chunks,
        embedding=OpenAIEmbeddings(
            openai_api_key=openai_api_key,
        ) 
    )


    # client.close()

    # Generate a unique filename using hash and timestamp
    filename = f'vectorstore_{str(time.time())}_{random.randint(1, 5000)}'
    vectorstore.save_local(repositry, filename)
    return filename
    # return os.path.join(repositry, filename)

def add_vectortsore(chunks,vectorName,repository):
    vectors = FAISS.load_local(folder_path=repository,embeddings=OpenAIEmbeddings(
                openai_api_key=openai_api_key,
            ) , index_name=vectorName,allow_dangerous_deserialization=True) 
    vectors.add_documents(chunks)
    vectors.save_local(folder_path=repository,index_name=vectorName)
    return True









def query(inputQestion,file_name,repository,braod_num) -> dict:
    '''
    params:

        inputQestion 输入的问题 
        file_name vectstore的位置
        repository 向量文件夹 
        braod_num 宽泛程度1-5

    return:

        {"answer": response["answer"],"references":references }
    '''

    vectors = FAISS.load_local(folder_path=repository,embeddings=OpenAIEmbeddings(
                openai_api_key=openai_api_key,
            ) , index_name=file_name,allow_dangerous_deserialization=True)  
    retriever = vectors.as_retriever(k = braod_num)


    prompt = ChatPromptTemplate.from_template("""你是一个深度学习领域的专家，请根据所给的context回答问题，无法回答的说不知道:
    
    <context>
                                            
    {context}
                                            
    </context>
    
    Question: {input}""")
    llm = ChatOpenAI(
        openai_api_key=openai_api_key,
        model_name="gpt-3.5-turbo",
        temperature = 0.0
    )
    document_chain = create_stuff_documents_chain(llm, prompt)

    retrieval_chain = create_retrieval_chain(retriever, document_chain)

    response = retrieval_chain.invoke({"input": inputQestion})
    relevant_documents = retriever.get_relevant_documents(inputQestion) 
    if len(relevant_documents) > braod_num:
        relevant_documents = relevant_documents[:braod_num]
    return {"answer": response["answer"],"references":[relevant_document.metadata for relevant_document in relevant_documents] }

# with open("result.txt", "w",encoding="utf-8") as f:
#          f.write(str([result.metadata for result in results]))

         


# vectorstore_1742813599.6693869_95
if __name__ == "__main__":
    page_list = process_Repository(baseRepository_path)
    chunks = chunkize_text(page_list)
    add_vectortsore(chunks,"vectorstore_1742813599.6693869_95",'baseVectorRepository')

