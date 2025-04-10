const path = require('path');
module.exports = {
    publicPath:'./',
	vueCompilerOptions: {
	    isCustomElement: (tag) => tag.startsWith('u-')
	  }
	};
}

