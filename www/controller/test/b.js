var b = function() {
	return this;
};
var conf = {
	'index' : function(){
		var data = {
			// 'value' : '/welcome',
			// 'ddd' : '/fuck'
		},
		self = this;
		this.setData(data);
		this.listen(function(data){
			self.cssLink = ['welcome'];
			data.name = '我是testB';
			return self.render('welcome', data);
		});
	}
};
exports.__create = controller.__create(b, conf);