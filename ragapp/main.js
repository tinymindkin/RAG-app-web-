import App from './App.vue'
import { createApp } from 'vue';
import uviewPlus from '@/node_modules/uview-plus'



import './uni.promisify.adaptor';

// #ifdef VUE3


const app = createApp(App);
app.use(uviewPlus);
app.mount('#app');

// #endif