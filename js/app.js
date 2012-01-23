var app = {};

app.ctrl = (function(){
	var system = {};
	var systems = {};
	var devices = {};
	
	var state = {
		running: false,
		reset: true,
		finished: false,
	};
	var k = 0;
	var t = 0;
	var kStop = 0;
	var timeout = 0;
	var duration = 0;
	var interval = 0;
	var boost = 0;
	var timer = {};	
	
	var run = function(){
		state.running = true;
		state.finished = false;
		state.reset = false;
		that.tick();
	};  
	var pause = function(){
		clearTimeout(timer);
		state.running = false;
	};  
	var reset = function(){
		pause();
		state.reset = true;
		k = 0;
	};
	
	var that = {};
	that.init = function(){	
		app.io.init();
		
		that.setDuration('60');
		that.setInterval('0.1');
		that.setBoost('1');
		
		var list = {};
		var systemKey;
		for(systemKey in systems)
			list[systemKey] = systems[systemKey].name;	
		app.io.setSystems(list);
		that.setSystem(systemKey);
	};	
	that.run = function(){
		if(state.running){
			pause();
			app.io.setRunButtonCaption('Continue');
		}
		else{
			if(state.finished)
				app.ctrl.reset();
			run();	
			app.io.setRunButtonCaption('Pause');
		};
		app.io.lock();
	};
	that.reset = function(){
		reset();
	    app.io.setRunButtonCaption('Run simulation!');	
		app.io.unlock();
	};	
	that.tick = function(){	
		if(k >= kStop){
			pause();
			state.finished = true;
			app.io.setRunButtonCaption('Reset and run simulation!');
			app.io.unlock();
		}
		else{
			system.execute({
				k: k++,
				tp: interval
			});
			timer = setTimeout('app.ctrl.tick()', timeout);
		}
		//app.view.update();
	};
	that.setSystem = function(systemKey){
		system = systems[systemKey].constructor({});
		app.io.drawSystem(system);
	};
	that.setDevice = function(managerKey, deviceKey){
		//system.setDevice(managerKey, deviceKey);
		//app.io.drawDevice(managerKey);		
	}
	that.setInterval = function(value){
		interval = app.limit(parseFloat(value), 0.001, 10) || interval;
		timeout = 1000 * interval / boost;
		kStop = duration / interval;
		app.io.setInterval(interval);
		
	};
	that.setDuration = function(value){
		duration = app.limit(parseFloat(value), 0.001) || duration;
		kStop = duration / interval;
		app.io.setDuration(duration);		
	};
	that.setBoost = function(value){
		boost = app.limit(parseFloat(value), 0.1, 10) || boost;
		timeout = 1000 * interval / boost;
		app.io.setBoost(boost);
	};
	that.selectDevice = function(deviceKey){
		//app.io.showDeviceManagerUI(system.getDeviceUI(deviceKey));
	};
	that.registerSystem = function(systemKey, systemName, systemConstructor){
		systems[systemKey] = {
			name: systemName,
			constructor: systemConstructor
		};
	};
	that.registerDevice = function(deviceKey, deviceType, deviceName, deviceConstructor){
		devices[deviceType] = devices[deviceType] || {};
		devices[deviceType][deviceKey] = {
			name: deviceName,
			constructor: deviceConstructor
		};
	};
	that.getDevices = function(deviceType){
		return devices[deviceType];
	};
	that.getDuration = function(){
		return duration;
	};
	return that;
})();

app.io = (function(){
	var chart = {};
	chart.height = 300;
	chart.width = 1000;
	
	var svg = {};
	var mouseOver = function(){
		$(this).attr('stroke', 'rgb(0, 0, 0)');
	};
	var mouseOut = function(){
		$(this).attr('stroke', 'rgb(200, 200, 200)');
	};
	var deviceClick = function(){
		app.ctrl.selectDevice($(this).prop('id'));
	};
	var arrowClick = function(){
		app.ctrl.selectDevice($(this).prop('id'));
	};

	var that = {};
	that.init = function(){
		$('.togglable h2').click(function(e){
			e.preventDefault();
			$(this).next().toggle();
		});			
		$('#runButton').click(function(){ 
			app.ctrl.run();
		});	
		$('#resetButton').click(function(){ 
			app.ctrl.reset();
		});		
		$('#durationInput').keyup(function(e){ 
			if(e.which == 13){
				e.preventDefault();
				app.ctrl.setDuration($(this).val());
			};
		});	
		$('#intervalInput').keyup(function(e){ 
			if(e.which == 13){
				e.preventDefault();
				app.ctrl.setInterval($(this).val());
			};
		});	
		$('#boostInput').keyup(function(e){ 
			if(e.which == 13){
				e.preventDefault();
				app.ctrl.setBoost($(this).val());
			};
		});	
		$('#systemSelector').change(function(){ 
			app.ctrl.setSystem($(this).val());
		});	
		svg = $('#chart').svg({
			settings: {
				height: chart.height,
				width: chart.width
			}
		}).svg('get');		
	};
	that.lock = function(){
		$('.lockable').prop('disabled', true);
	};	
	that.unlock = function(){
		$('.lockable').prop('disabled', false);
	};
	that.setSystems = function(systems){
		var select = $('#systemSelector');
		for(var systemKey in systems){
			var option = $('<option></option>');
			option.text(systems[systemKey]);
			option.val(systemKey);
			option.appendTo(select);
		};
		select.children(':last').prop('selected', true);
	};
	that.drawSystem = function(cs){
		$('#options h2').nextAll().empty();
		$('#options h2').after(cs.getUI());
		
		svg.clear();
		var system = cs.getSVGInterface()
		system.devices = system.devices || {};
		system.sums = system.sums || {};
		system.arrows = system.arrows || {};
		
		system.cols = system.cols || 0;
		var xStep = chart.width / (2 * system.cols);
		system.rows = system.rows || 0;
		var yStep = chart.height / (2 * system.rows);
		
		var matrix = [[]];
		for(var r = 0; r < system.rows; ++r){
			matrix[r] = [];
			for(var c = 0; c < system.cols; ++c)
				matrix[r][c] = 'u';
		};
				
		var device;
		for(var deviceKey in system.devices){
			device = system.devices[deviceKey];
			var x = xStep + (2 * device.getCol() * xStep);
			var y = yStep + (2 * device.getRow() * yStep);
			matrix[device.getRow()][device.getCol()] = 'd';
			
			var g = svg.group({
				transform: 'translate(' + x + ', ' + y +')'
			});
			r = svg.rect(g, -60, -40, 120, 80, 4, 4, {
				id: deviceKey,
				fill: 'rgb(240, 240, 240)',
				stroke: 'rgb(200, 200, 200)',
				strokeWidth: 2
			});	
			svg.text(g, 0, -25, device.getName(), {
				fill: 'rgb(0, 0, 0)',
				fontFamily: 'Verdana',
				fontSize: '12',
				textAnchor: "middle",
			});	
					
			$(r).mouseover(mouseOver).mouseout(mouseOut);
			$(r).click(deviceClick);			
		};
		
		var sum;
		for(var sumKey in system.sums){
			sum = system.sums[sumKey];
			var x = xStep + (2 * sum.col * xStep);
			var y = yStep + (2 * sum.row * yStep);
			matrix[sum.row][sum.col] = 's';
			
			var g = svg.group({
				transform: 'translate(' + x + ', ' + y +')'
			});
			
			svg.circle(g, 0, 0, 10, {
				fill: 'rgb(240, 240, 240)',
				stroke: 'rgb(200, 200, 200)',
				strokeWidth: 2
			});
			
			if(sum.up){
				svg.text(g, 5, -25, sum.up, {
					fill: 'rgb(0, 0, 0)',
					fontFamily: 'Verdana',
					fontSize: '12',
					textAnchor: "middle",
				});
			}				
			if(sum.down){
				svg.text(g, 5, 30, sum.down, {
					fill: 'rgb(0, 0, 0)',
					fontFamily: 'Verdana',
					fontSize: '12',
					textAnchor: "middle",
				});
			}				
			if(sum.left){
				svg.text(g, -25, -5, sum.left, {
					fill: 'rgb(0, 0, 0)',
					fontFamily: 'Verdana',
					fontSize: '12',
					textAnchor: "middle",
				});
			}				
			if(sum.right){
				svg.text(g, 25, -5, sum.right, {
					fill: 'rgb(0, 0, 0)',
					fontFamily: 'Verdana',
					fontSize: '12',
					textAnchor: "middle",
				});
			}			
		};
		
		var arrow;
		for(var arrowKey in system.arrows){
			arrow = system.arrows[arrowKey];			
			
			var xFrom = xStep + (2 * arrow.from.col * xStep);
			var yFrom = yStep + (2 * arrow.from.row * yStep);
			var xTo = xStep + (2 * arrow.to.col * xStep);
			var yTo = yStep + (2 * arrow.to.row * yStep);
			
			var dir;
			if(arrow.from.col == arrow.to.col)
				if(arrow.from.row < arrow.to.row)
					dir = 90;
				else
					dir = -90;
			else if(arrow.from.col > arrow.to.col)
				dir = 180;
			else
				dir = 0;			
						
			switch(matrix[arrow.from.row][arrow.from.col]){
				case 'd':
					switch(dir){
						case 90:
							yFrom -= 41;
							break;
						case -90:
							yFrom += 41;
							break;
						case 180:
							xFrom -= 61;
							break;
						case 0:
							xFrom += 61;
							break;
					};
					break;
				case 's':
					switch(dir){
						case 90:
							yFrom -= 12;
							break;
						case -90:
							yFrom += 12;
							break;
						case 180:
							xFrom -= 12;
							break;
						case 0:
							xFrom += 12;
							break;
					};
					break;				
			};	
			switch(matrix[arrow.to.row][arrow.to.col]){
				case 'd':
					switch(dir){
						case 90:
							yTo -= 41;
							break;
						case -90:
							yTo += 41;
							break;
						case 180:
							xTo += 61;
							break;
						case 0:
							xTo -= 61;
							break;
					};
					break;
				case 's':
					switch(dir){
						case 90:
							yTo -= 12;
							break;
						case -90:
							yTo += 12;
							break;
						case 180:
							xTo += 12;
							break;
						case 0:
							xTo -= 12;
							break;
					};
					break;				
			};			
						
			var a = svg.line(xFrom, yFrom, xTo, yTo, {
				strokeWidth: 2,
				stroke: 'rgb(200, 200, 200)',
			});
			if(arrow.to.arrow){			
				var g = svg.group({
					transform: 'translate(' + xTo + ', ' + yTo +') rotate(' + dir + ')'
				});
				svg.polygon(g, [[-1,0],[-10,5],[-10,-5]], {
					strokeWidth: 2,
					fill: 'rgb(200, 200, 200)',
					stroke: 'rgb(200, 200, 200)'
				});
			};
			if(arrow.from.arrow){			
				var g = svg.group({
					transform: 'translate(' + xFrom + ', ' + yFrom +') rotate(' + (-dir) + ')'
				});
				svg.polygon(g, [[-1,0],[-10,5],[-10,-5]], {
					strokeWidth: 2,
					fill: 'rgb(200, 200, 200)',
					stroke: 'rgb(200, 200, 200)'
				});
			};
			//$(a).mouseover(mouseOver).mouseout(mouseOut);
			//$(a).click(arrowClick);			
		};
	};
	that.updateOptions = function(device){
		var placeholder = $('#optionsPlaceholder');
		placeholder.empty();
		if(device)
			device.setOptions(placeholder);
	};
	that.setRunButtonCaption = function(caption){
		$('#runButton').val(caption);
	};
	that.setInterval = function(value){
		$('#intervalInput').val(value);
	};
	that.setBoost = function(value){
		$('#boostInput').val(value);
	};
	that.setDuration = function(value){
		$('#durationInput').val(value);
	};
	return that;
})();

app.UIElement = function(spec){
	spec.getUI = spec.getUI || function(){
		var result = $('<p></p>');
		result.text(spec.title);		
		return result;
	};
	
	var that = {};	
	that.getUI = function(){
		return spec.getUI();
	};
	
	return that;
};

app.limit = function(value, min, max){
	if(isNaN(value)){
		return undefined;
	}
	else{
		return ((value < min) ? min : ((value > max) ? max : value));		
	};
};

app.sum = function(){
	if(arguments[0]){
		var res = arguments[0].slice();
		for(var i = 1; i < arguments.length; i++)
			for(var j in arguments[i])
				res[j] += arguments[i][j];  
		return res;	
	}
	else
		return []; 
};
	
app.mulV = function(x, y){
	var res = 0;
	for(var i in x)
		res += x[i]*y[i]; 
	return res;
};
	
app.mulS = function(x, y){
	var res = [];
	for(var i in x)
		res[i] = x[i] * y;
	return res;
};

app.tf2ss = function(numerator, denominator){
	if(numerator.length > denominator.length)
		return undefined;
	
	var model = {
		A: [],
		B: [],
		C: [],
		D: 0,
		state: []
	};
	var rank = denominator.length - 1;
	var zeros = [];
	for(var i = 0; i < rank; i++)
		zeros[i] = 0;	
		
	numerator = app.mulS(numerator, 1/denominator[0]);
	numerator.reverse();
	numerator = numerator.concat(zeros).slice(0, rank+1);
	denominator = app.mulS(denominator, 1/denominator[0]);	
	denominator.reverse();		
	  
	for(var i = 0; i < rank-1; i++){
		model.A[i] = zeros.slice();
		model.A[i][i+1] = 1;
	}
	model.A[rank-1] = app.mulS(denominator.slice(0, rank), -1);
	  
	model.B = zeros.slice();	  
	model.B[rank-1] = 1;
	  
	model.C = app.sum(numerator.slice(0, rank), app.mulS(model.A[rank-1], -1 * numerator[rank]));
	  
	model.D = numerator[rank];
	  
	model.state = zeros.slice();	

	return model;
};

app.solve = function(input, model, state, tp){
	var k1 = [];
	var k2 = [];
	var k3 = [];
	var k4 = [];	

	for(var i in state)
		k1[i] = app.mulV(model.A[i], state) + model.B[i] * input;	
	for(var i in state)
		k2[i] = app.mulV(model.A[i], app.sum(state, app.mulS(k1, 0.5 * tp))) + model.B[i] * input;		
	for(var i in state)
		k3[i] = app.mulV(model.A[i], app.sum(state, app.mulS(k2, 0.5 * tp))) + model.B[i] * input;		
	for(var i in state)
		k4[i] = app.mulV(model.A[i], app.sum(state, app.mulS(k3, tp))) + model.B[i] * input;

	return app.sum(state, app.mulS(app.sum(k1, app.mulS(k2, 2), app.mulS(k3, 2), k4), 0.16667 * tp));
};

app.Variable = function(spec){
	spec.value = spec.value;
	spec.observers = spec.observers || [];
	spec.notify = spec.notify || function(){
		spec.observers.map(function(o){
			o(spec.value);
		});
	};

	var that = {};

	that.set = function(value){
		if(value !== undefined)
			spec.value = value;
		spec.notify();
		return spec.value;
	};
	
	that.get = function(){
		return spec.value;
	};
	
	that.attachFunction = function(fcn){
		if(spec.observers.some(function(o){return (o === fcn);}) === false)
			return spec.observers.push(fcn);
		else
			return false;
	};
	
	that.detachFunction = function(fcn){
		return spec.observers.splice(spec.observers.indexOf(fcn), 1);
	};
	
	return that;
};

app.Parameter = function(spec){	
	spec.name = spec.name || 'Just parameter';	
	spec.variable = spec.variable || app.Variable({});		
	spec.get = spec.get || function(value){
		return value;
	};
	spec.set = spec.set || function(value){
		return value;
	};
	spec.variable.attachFunction(function(value){
		input.val(that.get());
	});
	
	var input = $('<input type="text">').addClass('floatInput');
	input.keyup(function(e){ 
		if(e.which == 13){
			e.preventDefault();
			that.set($(this).val());
		};
	});
	
	var that = {};	
	that.get = function(){
		return spec.get(spec.variable.get());
	};	
	that.set = function(value){
		spec.variable.set(spec.set(value));
		return that.get();
	};
	that.getUI = function(){
		var li = $('<li></li>');		
		li.text(spec.name + ': ');
		li.append(input);		
		return li;
	}
	
	input.val(that.get());	
	return that;		
};
	
app.FloatParameter = function(spec){
	spec.variable = spec.variable || app.Variable({});
	spec.min = (isNaN(spec.min) ? undefined : spec.min);
	spec.max = (isNaN(spec.max) ? undefined : spec.max);
	spec.set = spec.set || function(value){
		return app.limit(parseFloat(value), spec.min, spec.max);
	};
		
	var that = app.Parameter(spec);
	return that;		
};

app.FloatVectorParameter = function(spec){
	spec.variable = spec.variable || app.Variable({});	
	spec.get = spec.get || function(value){
		return value.join(' ');
	};
	spec.set = spec.set || function(value){
		return value.split(' ').map(function(x){
			return parseFloat(x) || 0;
		});
	};
	
	var that = app.Parameter(spec);	
	return that;		
};

app.Manager = function(spec){
	var select = $('<select id="deviceSelector"></select>');
	var deviceParameters = $('<ul></ul>').addClass('optionlist');
	var getDeviceUI = function(){
		deviceParameters.empty();
		parameters = spec.device.getUI();	
		for(var parameterKey in parameters){
			deviceParameters.append(parameters[parameterKey]);
		};
	}
	
	var devices = app.ctrl.getDevices(spec.type);
		
	spec.name = spec.name || 'Unknown';
	spec.col = spec.col || 0;
	spec.row = spec.row || 0;
	spec.type = spec.type || 'all';
	spec.device = spec.device || {};
	
	var that = {};	
	that.getName = function(){
		return spec.name;
	};	
	that.getCol = function(){
		return spec.col;
	};
	that.getRow = function(){
		return spec.row;
	};
	that.execute = function(time, input){
		return spec.device.execute(time, input);
	}
	that.setDevice = function(deviceKey){
		spec.device = devices[deviceKey].constructor({});	
		getDeviceUI();
	};
	
	that.getUI = function(){
		var ul = $('<ul class="subsublist"></ul>');
		
		var selectLi = $('<li></li>');
		selectLi.text(spec.name + ' type: ');	
		
		var deviceKey;
		for(deviceKey in devices){
			var option = $('<option></option>');
			option.val(deviceKey);
			option.text(devices[deviceKey].name);
			option.appendTo(select);
		};
		selectLi.append(select);		
		ul.append(selectLi);
		
		select.change(function(){
			that.setDevice($(this).val());		
		});
			
		getDeviceUI();		
		ul.append($('<li></li>').append(deviceParameters));
			
		return ul;
	};
	return that;
};

app.Device = function(spec){	
	spec.parameters = spec.parameters || [];
	spec.signals = spec.signals || [];
	spec.execute = spec.execute || function(){};
	
	var that = {};
	that.execute = function(time, input){
		return spec.execute(time, input);
	};
	that.getUI = function(){
		return spec.parameters.map(function(parameter){
			return parameter.getUI();
		});
	};
	that.getSignals = function(time, input){
		return spec.signals.map(function(signals){
			return parameter.getUI();
		});
	};
	return that;
};

app.BasicGenerator = function(spec){
	var value = app.Variable({
		value: 0,
	});	
	
	spec.parameters = [
		app.FloatParameter({
			name: "Output value",
			variable: value
		})
	];
	spec.execute = function(){
		return value.get();
	};
		
	var that = app.Device(spec);
	return that;
};
app.ctrl.registerDevice('basicGen', 'generator', "Basic generator", app.BasicGenerator);

app.SineGenerator = function(spec){
	var amplitude = app.Variable({
		value: 1
	});
	
	var omega = app.Variable({
		value: 2 * Math.PI / 10
	});
	
	spec.parameters = [
		app.FloatParameter({
			name: "Amplitude",
			variable: amplitude,
		}),
		app.FloatParameter({
			name: "Frequency",
			variable: omega,
			set: function(frequency){
				return (2 * Math.PI * frequency);
			},
			get: function(omega){
				return (omega / (2 * Math.PI));
			}
		}),
		app.FloatParameter({
			name: "Period",
			variable: omega,
			set: function(period){
				return (2 * Math.PI / period);
			},
			get: function(omega){
				return (2 * Math.PI / omega);
			}
		})
	];
	spec.execute = function(time){
		return amplitude.get() * Math.sin(time.k * time.tp * omega.get());
	};
		
	var that = app.Device(spec);
	return that;
};
app.ctrl.registerDevice('sineGen', 'generator', "Sine generator", app.SineGenerator);

app.ControlSystem = function(spec){
	spec = spec || {};
	spec.devices  = spec.devices || {};
	spec.sums = spec.sums || {};
	spec.arrows = spec.arrows || {};
	spec.execute = spec.execute || function(){};

	var that = {};
	that.getSVGInterface = function(){
		return spec;
	};
	that.getUI = function(){
		var ul = $('<ul></ul>').addClass('optionlist');
		for(var deviceKey in spec.devices){			
			ul.append($('<li></li>').addClass(deviceKey).append(spec.devices[deviceKey].getUI()));
		}
		return ul;
	};
	that.execute = function(time){
		spec.execute(time);
	};
	return that;
};

app.ProcessTest = function(spec){	
	var process = app.LinearProcess({});
	var generator = app.BasicGenerator({});
	var input = 0;
	
	spec.name = spec.name || 'Process research';
	spec.cols = 3;
	spec.rows = 1;
	spec.devices = {
		process: app.Manager({
			name: 'Process',
			col: 1,
			row: 0,
			type: 'process',
			device: process
		}),
		spGenerator: app.Manager({
			name: 'Signal',
			col: 0,
			row: 0,
			type: 'generator',
			device: generator
		})
	};
	spec.arrows = {
		arr1: {
			from: {col: 0, row: 0},
			to: {col: 1, row: 0, arrow: true}			
		},
		arr2: {
			from: {col: 1, row: 0},
			to: {col: 2, row: 0, arrow: true}			
		}
	};
	
	spec.execute = function(time){
		input = generator.execute(time);
		process.execute(time, input);
	};
	
	var that = app.ControlSystem(spec);
	return that;
};
app.ctrl.registerSystem('processTest', "Process research", app.ProcessTest);

app.OpenLoop = function(spec){	
	var process = app.LinearProcess({});
	var spGenerator = app.BasicGenerator({});
	var controller = app.PID({});
	var distGenerator = app.BasicGenerator({});

	spec.name = spec.name || 'Open loop control system';
	spec.cols = 4;
	spec.rows = 2;
	spec.devices = {
		process: app.Manager({
			name: 'Process',
			col: 2,
			row: 0,
			type: 'process',
			device: process
		}),
		controller: app.Manager({
			name: 'Controller',
			col: 2,
			row: 1,
			type: 'controller',
			device: controller
		}),
		spGenerator: app.Manager({
			name: 'SP generator',
			col: 3,
			row: 1,
			type: 'generator',
			device: spGenerator
		}),
		distGenerator: app.Manager({
			name: 'Disturbance',
			col: 0,
			row: 0,
			type: 'generator',
			device: distGenerator
		})
	};
	spec.sums = {
		sum1: {
			col: 1,
			row: 0,
			left: '+',
			down: '+'
		}
	};
	spec.arrows = {
		arr1: {
			from: {col: 3, row: 1},
			to: {col: 2, row: 1, arrow: true}			
		},
		arr2: {
			from: {col: 2, row: 1},
			to: {col: 1, row: 1}			
		},
		arr3: {
			from: {col: 1, row: 1},
			to: {col: 1, row: 0, arrow: true}			
		},
		arr4: {
			from: {col: 0, row: 0},
			to: {col: 1, row: 0, arrow: true}			
		},
		arr5: {
			from: {col: 1, row: 0},
			to: {col: 2, row: 0, arrow: true}			
		},
		arr6: {
			from: {col: 2, row: 0},
			to: {col: 3, row: 0, arrow: true}			
		}		
	};
	var that = app.ControlSystem(spec);
	return that;
};
//app.ctrl.registerSystem('openLoop', "Open loop system", app.OpenLoop);

app.ClosedLoop = function(spec){	
	var sp = 0;
	var e = 0;
	var pv = 0;
	var cv = 0;
	var u = 0;
	var z = 0;
	var spLine = [];
	var eLine = [];
	var pvLine = [];
	var cvLine = [];
	var uLine = [];
	var zLine = [];
	
	spec.name = spec.name || 'Closed loop control system';
	spec.cols = 5;
	spec.rows = 2;
	spec.devices = {
		process: app.Manager({
			name: 'Process',
			col: 2,
			row: 0,
			type: 'process',
			device: app.LinearProcess({})
		}),
		controller: app.Manager({
			name: 'Controller',
			col: 2,
			row: 1,
			type: 'controller',
			device: app.PID({})
		}),
		spGenerator: app.Manager({
			name: 'SP generator',
			col: 4,
			row: 1,
			type: 'generator',
			device: app.BasicGenerator({})
		}),
		distGenerator: app.Manager({
			name: 'Disturbance',
			col: 0,
			row: 0,
			type: 'generator',
			device: app.BasicGenerator({})
		})
	};
	spec.sums = {
		sum1: {col: 3, row: 1, right: '+', up: '-'},
		sum2: {col: 1, row: 0, left: '+', down: '+'}
	};
	spec.arrows = {
		arr1: {
			from: {col: 4, row: 1},
			to: {col: 3, row: 1, arrow: true}			
		},
		arr2: {
			from: {col: 3, row: 1},
			to: {col: 2, row: 1, arrow: true}			
		},
		arr3: {
			from: {col: 2, row: 1},
			to: {col: 1, row: 1}			
		},
		arr4: {
			from: {col: 1, row: 1},
			to: {col: 1, row: 0, arrow: true}			
		},
		arr5: {
			from: {col: 0, row: 0},
			to: {col: 1, row: 0, arrow: true}			
		},
		arr6: {
			from: {col: 1, row: 0},
			to: {col: 2, row: 0, arrow: true}			
		},
		arr7: {
			from: {col: 2, row: 0},
			to: {col: 3, row: 0}			
		},
		arr8: {
			from: {col: 3, row: 0},
			to: {col: 4, row: 0, arrow: true}			
		},
		arr9: {
			from: {col: 3, row: 0},
			to: {col: 3, row: 1, arrow: true}			
		}		
	};
	spec.execute = function(time){
		sp = spec.devices.spGenerator.execute(time);
		e = sp - pv;
		cv = spec.devices.controller.execute(time, e);
		z = spec.devices.distGenerator.execute(time);
		u = z + cv;
		pv = spec.devices.process.execute(time, u);
		
		var t = time.k * time.tp;
		
		if(time.k == 0){
			spLine = [];
			eLine = [];
			cvLine = [];
			zLine = [];
			uLine = [];
			pvLine = [];			
		};
		
		spLine.push([t, sp]);
		eLine.push([t, e]);
		cvLine.push([t, cv]);
		zLine.push([t, z]);
		uLine.push([t, u]);
		pvLine.push([t, pv]);
						
		$.plot($("#plot1"), [		
			{label: 'SP', data: spLine}, 
			{label: 'PV', data: pvLine}, 
			{label: 'e', data: eLine}
		],{
			xaxis: {min: 0, max: app.ctrl.getDuration()}
		});
		$.plot($("#plot2"), [
			{label: 'CV', data: cvLine},
			{label: 'u', data: uLine}, 
			{label: 'z', data: zLine}
		],{
			xaxis: {min: 0, max: app.ctrl.getDuration()}
		});
	};
	
	var that = app.ControlSystem(spec);
	return that;
};
app.ctrl.registerSystem('closedLoop', "Closed loop control system", app.ClosedLoop);

app.Cascade = function(spec){
	spec.name = spec.name || 'Cascade control system';
	spec.cols = 7;
	spec.rows = 2;
	spec.devices = {
		fastProcess: app.Manager({
			name: 'Fast process',
			col: 2,
			row: 0,
			type: 'process'
		}),
		slowProcess: app.Manager({
			name: 'Slow process',
			col: 4,
			row: 0,
			type: 'process'
		}),
		fastController: app.Manager({
			name: 'Fast controller',
			col: 2,
			row: 1,
			type: 'controller'
		}),
		slowController: app.Manager({
			name: 'Slow controller',
			col: 4,
			row: 1,
			type: 'controller'
		}),
		spGenerator: app.Manager({
			name: 'SP generator',
			col: 6,
			row: 1,
			type: 'generator'
		}),
		distGenerator: app.Manager({
			name: 'Disturbance',
			col: 0,
			row: 0,
			type: 'generator'
		})
	};
	spec.sums = {
		sum1: {
			col: 3,
			row: 1,
			right: '+',
			up: '-'
		},
		sum2: {
			col: 1,
			row: 0,
			left: '+',
			down: '+'
		},
		sum3: {
			col: 5,
			row: 1,
			right: '+',
			up: '-'
		}
	};
	spec.arrows = {
		arr1: {
			from: {
				col: 4,
				row: 1
			},
			to: {
				col: 3,
				row: 1,	
				arrow: true		
			}			
		},
		arr2: {
			from: {
				col: 3,
				row: 1
			},
			to: {
				col: 2,
				row: 1,	
				arrow: true			
			}			
		},
		arr3: {
			from: {
				col: 2,
				row: 1
			},
			to: {
				col: 1,
				row: 1		
			}			
		},
		arr4: {
			from: {
				col: 1,
				row: 1
			},
			to: {
				col: 1,
				row: 0,	
				arrow: true			
			}			
		},
		arr5: {
			from: {
				col: 0,
				row: 0
			},
			to: {
				col: 1,
				row: 0,	
				arrow: true			
			}			
		},
		arr6: {
			from: {
				col: 1,
				row: 0
			},
			to: {
				col: 2,
				row: 0,	
				arrow: true		
			}			
		},
		arr7: {
			from: {
				col: 2,
				row: 0
			},
			to: {
				col: 3,
				row: 0
			}			
		},
		arr8: {
			from: {
				col: 3,
				row: 0
			},
			to: {
				col: 4,
				row: 0,	
				arrow: true		
			}			
		},
		arr9: {
			from: {
				col: 3,
				row: 0
			},
			to: {
				col: 3,
				row: 1,	
				arrow: true		
			}			
		},
		arr10: {
			from: {
				col: 4,
				row: 0
			},
			to: {
				col: 5,
				row: 0			
			}			
		},
		arr11: {
			from: {
				col: 5,
				row: 0
			},
			to: {
				col: 6,
				row: 0,	
				arrow: true			
			}			
		},
		arr12: {
			from: {
				col: 5,
				row: 0
			},
			to: {
				col: 5,
				row: 1,	
				arrow: true		
			}			
		},
		arr13: {
			from: {
				col: 6,
				row: 1
			},
			to: {
				col: 5,
				row: 1,	
				arrow: true		
			}			
		},
		arr14: {
			from: {
				col: 5,
				row: 1
			},
			to: {
				col: 4,
				row: 1,	
				arrow: true		
			}			
		}		
	};
	
	
	var that = app.ControlSystem(spec);
	return that;
};
//app.ctrl.registerSystem('cascade', "Cascade control system", app.Cascade);

app.InputToOutput = function(spec){
	spec.title = spec.title || 'Input to output';
		
	var that = app.Device(spec);
	return that;
};

app.LinearProcess = function(spec){
	spec.numerator = spec.numerator || app.Variable({
		value: [1]
	});
	spec.denominator = spec.denominator || app.Variable({
		value: [5, 1]
	});
	var delay = app.Variable({
		value: 0
	});
	
	var model = {};

	spec.parameters = spec.parameters || [
		app.FloatVectorParameter({
			name: "Numerator",
			variable: spec.numerator
		}),
		app.FloatVectorParameter({
			name: "Denominator",
			variable: spec.denominator
		}),
		app.FloatParameter({
			name: "Delay",
			variable: delay,
			min: 0
		})
	];	
	spec.numerator.attachFunction(function(){
		model = app.tf2ss(spec.numerator.get(), spec.denominator.get());
	});
	spec.denominator.attachFunction(function(){
		model = app.tf2ss(spec.numerator.get(), spec.denominator.get());
		console.debug(model);
	});
	model = app.tf2ss(spec.numerator.get(), spec.denominator.get());
	
	spec.execute = spec.execute || function(time, input){
		var res = app.mulV(model.C, model.state) + model.D * input;
		model.state = app.solve(input, model, model.state, time.tp);
		return res;
	};
	
	var that = app.Device(spec);
	return that;
};
app.ctrl.registerDevice('linearProcess', 'process', "Transfer function", app.LinearProcess);

app.PID = function(spec){
	var kp = app.Variable({
		value: 1
	});
	var Ti = app.Variable({
		value: 50
	});
	var Td = app.Variable({
		value: 2
	});
	var kd = app.Variable({
		value: 8
	});

	spec.numerator = spec.numerator || app.Variable({
		value: [1]
	});
	spec.denominator = spec.denominator || app.Variable({
		value: [1]
	});
	spec.parameters = spec.parameters || [
		app.FloatParameter({
			name: "kp",
			variable: kp
		}),
		app.FloatParameter({
			name: "Ti",
			variable: Ti,
			min: 0
		}),
		app.FloatParameter({
			name: "Td",
			variable: Td,
			min: 0
		}),
		app.FloatParameter({
			name: "kd",
			variable: kd,
			max: 100,
			min: 1
		})
	];
	
	var pid2tf = function(){
		if(Ti.get() == 0 && Td.get() == 0){
			spec.numerator.set([kp.get]);
			spec.denominator.set([1]);
		}
		else if(Td.get() == 0){
			spec.numerator.set([
				kp.get() * Ti.get(),
				kp.get()
			]);
			spec.denominator.set([
				Ti.get(),
				0
			]);
		}
		else if(Ti.get() == 0){
			spec.numerator.set([
				kp.get() * (Td.get() / kd.get() + Td.get()),
				kp.get()
			]);
			spec.denominator.set([
				Td.get() / kd.get(),
				1
			]);
		}
		else{	
			spec.numerator.set([
				kp.get() * Ti.get() * (Td.get() / kd.get() + Td.get()),
				kp.get() * (Ti.get() + Td.get() / kd.get()),
				kp.get()
			]);
			spec.denominator.set([
				Ti.get() * Td.get() / kd.get(),
				Ti.get(),
				0
			]);		
		};		
	};
	
	kp.attachFunction(function(){
		pid2tf();
	});
	Ti.attachFunction(function(){
		pid2tf();
	});
	Td.attachFunction(function(){
		pid2tf();
	});
	kd.attachFunction(function(){
		pid2tf();
	});
	
	var that = app.LinearProcess(spec);
	
	pid2tf();
	
	return that;
};
app.ctrl.registerDevice('pidController', 'controller', "PID", app.PID);


$(function(){
	app.ctrl.init();
});