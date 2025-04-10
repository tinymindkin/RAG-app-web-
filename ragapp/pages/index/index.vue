<template>
	<view id="app" >

			<Uslider v-model="broad_num" min="1" max="5" :showValue="true"></Uslider>

			<view class="upload" @click="chooseFile(uploadFile)" style="flex-direction: row; display: flex; justify-content: center;">
			  <Uicon name="plus-circle" ></Uicon>
			  <span >点击上传文献(上面选择查询页数)</span>
			</view>
			
		
		<UcellGroup :border="false" >
		          <Ucell v-for="(file, index) in fileList" :key="index">
		            <template #title>
		              <view
		                style="width:70vw; display:inline-block; white-space:pre-wrap; word-wrap:break-word; height:auto; margin-right:10rpx;">
											{{ file.url }}
		              </view>
		            </template>
		          </Ucell>
		    </UcellGroup>
		<h2 style="text-align: center;">answer</h2>
		<UTextarea title="textArea" v-model="answer" placeholder="" style="height: 100rpx;" ></UTextarea>
		
		<table  style=" padding-bottom: 100px;">
			<tr>
				<td style="text-align: center;">tile</td> <td style="text-align: center;">页数</td>
			</tr>
			<tr v-for="(refer,index) in references" :key="index">
				<td style="text-align: center;">{{refer[0]}}</td> <td style="text-align: center;">{{refer[1] + 1}}</td>
			</tr>
		</table>
		
		<view class="search-wapper" >
			<view class="search">
				<Usearch placeholder="请提问" v-model="question" @search="query" @custom="query"></Usearch>
			</view>
		</view>
		
	</view>
</template>
<script>
import axios from "axios";
import UTextarea from 'uview-plus/components/u-textarea/u-textarea.vue';
import Usearch from 'uview-plus/components/u-search/u-search.vue';
import UcellGroup from 'uview-plus/components/u-cell-group/u-cell-group.vue';
import Uslider from 'uview-plus/components/u-slider/u-slider.vue';
import Uicon from 'uview-plus/components/u-icon/u-icon.vue';
import Ucell from 'uview-plus/components/u-cell/u-cell.vue';
import  {chooseFile } from '@/utils/uploadFile.js'
import  {uploadFileNative } from '@/utils/uploadFileNative.js'
	export default {
		components:{
			UTextarea,
			Usearch,
			UcellGroup,
			Uslider,
			Uicon,
			Ucell,
		},
		data() {
			uni.request({
			  url: '',
			  method: 'GET',
			  success: (res) => {
			    console.log('请求成功:', res.data);
			  },
			  fail: (err) => {
			    console.error('请求失败:', err);
			    uni.showModal({
			      title: "提示",
			      content: "请求失败，请重试！",
			      showCancel: false
			    });
			  }
			});
			plus.android.requestPermissions(["android.permission.READ_EXTERNAL_STORAGE"], (result) => {
			    console.log("权限申请结果：" + JSON.stringify(result));
			}, (err) => {
			    console.error("权限申请失败：" + JSON.stringify(err));
			});
			return {
				answer: '',
				question:"",
				fileList: [], //点击上传后，在 本地 保留的文件地址及其他的文件信息
				form: {
					  file: [] //传给 后端 后返回来的文件地址及文件信息
					},
				loaderInstance: null,
				broad_num : 5,
				references : [],
				fileManager:plus.io
				
			}
		}, methods:{
			chooseFile,uploadFileNative,
			uploadFile(file) {
							if (file.code == 200) {
								let urlList = file.data["file"][0]["url"].split("/")
							  	this.fileList.push({
							  			url: file.data["file"][0]["url"],
							  			name: urlList[urlList.length - 1 ]
							  		});
								uni.showLoading()
								// this.uploadFileNative(this.fileList[this.fileList.length - 1].url)
								// uni.hideLoading()
								let cookie = plus.navigator.getCookie("http://118.31.113.55:8083");
								uni.uploadFile({
									  url: "",
									  filePath: this.fileList[this.fileList.length - 1].url,
									  name: "file",
									  header: {
									      'Cookie': cookie // 设置 Cookie 到请求头
									    },
									  success: (res) => {
										uni.hideLoading();
										console.log(res);
										  uni.showModal({
											title: "提示",
											content: "上传成功！" + res.data,
											showCancel: false
										  });
									  },
									  fail: (err) => {
										uni.hideLoading();

										console.log(err);
										  uni.showModal({
											title: "提示",
											content: "上传失败！" + err.errMsg,
											showCancel: false
										  });
									  }
								  });
							  }else{
							  	uni.showToast({
							  	   title: '选择文件出现未知问题',
							  	   icon: 'none',
							  	   duration: 2000
							     });
							  };
					},query(){
						uni.showLoading({
						  title: "Al加速检索中……",
						  mask: true 
						});
						
						//uni.request
						uni.request({
						  url: ``,
						  method: 'GET',
						  data: {
						    question: this.question,
						    broad_num: this.broad_num
						  },
						  withCredentials: true, // 跨域请求携带cookie
						  success: (res) => {
						    if (res.statusCode === 200) {
						      this.answer = res.data.answer;
						      this.references = res.data.references;
						    } else {
						      uni.showModal({
						        title: "提示",
						        content: "请求失败，请重试" ,
						        showCancel: false,
						        confirmText: "确定"
						      });
							  console.log(res);
						    }
						    uni.hideLoading();
						  },
						  fail: (err) => {
						    uni.hideLoading();
						    uni.showModal({
						      title: "提示",
						      content: "检索失败，请重试：" + err.errMsg,
						      showCancel: false,
						      confirmText: "确定"
						    });
						  }
						});
					},chooseAll() {
						uni.chooseFile({
						  type: 'all',
						  count: 1,
						  success: (res) => {
							console.log(res)
							if (res.tempFiles.length > 0) {
							  this.log += this.getPath(res.tempFiles) + '\n\n'
							}
						  },
						  complete: (res) => {
							console.log(res)
						  }
						})
      }
	}

		
}

</script>

<style>
#app{
    min-height:100vh;
	flex-direction: column;
    display:flex;
	justify-content: center
}	
	.UcellGroup{
		display: flex;
		height: 10rpx
	}
	.search {
		width: 100%;
		position: relative;
	}
	

	.search-wapper {
			height: 130rpx;
			box-sizing: border-box;
			display: flex;
			align-items: center;
			position: fixed;
			bottom: 0;
			width: 100%;
			background-color: #F8FAFF;
			z-index: 100;
		}

	

</style>