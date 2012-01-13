var app = {};

$(function(){
  app.view.init();
});

Sum = function(){
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
	
MulV = function(x, y){
  var res = 0;
  for(var i in x){
    res += x[i]*y[i];  
  }
  return res;
};
	
MulS = function(x, y){
  var res = [];
  for(var i in x){
    res[i] = x[i] * y;  
  }
  return res;
};

myParseFloat = function(str, def, min, max){
  var res = parseFloat(str);
  if(typeof res == 'number'){
    if((typeof min == 'number') && (res < min))
      res = min;
    if((typeof max == 'number') && (res > max))
	  res = max;
  }
  else
    res = def;			  
  return res;
};

app.Parameter = function(initialValue, parser){
	var _value = initialValue;
	var _observers = [];
	var _parser;
	
	var _notify = function(){
		_observers.map(function(o){
			o(_value);
		});
	};
	
	if(parser){
		_parser = parser;
	}
	else{
		_parser = function(value){
			return value;
		};
	};
	
	return {
		set: function(value){
			var parsed = _parser(value);
			if(parsed !== undefined){
				_value = parsed;
				_notify();
			};
			return _value;
		},
		
		get: function(){
			return _value;
		},
		
		enable: function(){
			_enable = true;
			_notify();
		},
		
		disable: function(){
			_enable = false;
			_notify();
		},
		
		isEnable: function(){
			return _enable;
		},
		
		attachFunction: function(fcn){
			if(_observers.some(function(o){return (o === fcn);}) === false){
				return _observers.push(fcn);
			}
			else{
				return false;
			}
		},
		
		detachFunction: function(fcn){
			return _observers.splice(indexOf(fcn), 1);
		}
	};
};

app.ParameterIO = function(parameter){

};

app.io = {
	addParameter: function(parent, parameter){
		var _name = $('<h4></h4>');
		var _input = $('<input type="text"></input>');
		var _description = $('<div></div>');
		var _parameter = $('<li></li>');		
		
		_parameter.prependTo(
			parent
		).append(
			_name
		).append(
			_input
		).append(
			_description
		).mouseover(function(){
			$(this).children('div').toggle();
		});		
		
		_name.text(
			(parameter.name === undefined) ? 'No name' : parameter.name
		);
				
		_input.keyup(function(e){
			if(e.which == 13){
				e.preventDefault();
				$(this) .change();
			};
		}).change(function(){
			$(this).prop('value', parameter.set($(this).prop('value')));
			alert(parameter.get($(this).prop('value')));
		});	
		
		_description.text(
			(parameter.description === undefined) ? 'No description.' : parameter.description
		).hide();
	}	
};

app.limit = function(value, min, max){
	if(isNaN(value)){
		return undefined;
	}
	else{
		return ((value < min) ? min : ((value > max) ? max : value));		
	};
};

app.FloatParser = function(min, max){
	var _min = min;
	var _max = max;
	return function(value){
		return app.limit(parseFloat(value), _min, _max);		
	};
};

app.IntParser = function(min, max){
	var _min = min;
	var _max = max;
	return function(value){
		return app.limit(parseInt(value, 10), _min, _max);		
	};
};


app.view = {  
  addParamPanel: function(context, res){  
    var div = '<div class="' + res + '">';
	if(context[res].name)
	  div += '<h3>' + context[res].name + ' options</h3>';
	else
	  div += '<h3>Unknown options</h3>';	  
	div += '<ul class="devList"></ul>';		  
	div += '<ul class="paramList"></ul>';		  
	div += '</div>';
	
	$('div#params').append(div);
  },
  
  updateParamList: function(context, res){  
	for(var param in context[res].params){
	  this.addParamListElement(context[res].params, param, res);
	}
  },
  
  
  
  addParamListElement: function(context, res, parent){  
    var li = '<li class="' + res + '">';
	li += context[res].name + ': ';
	switch(context[res].type){
	  case 'number':
	    li += '<input type="text" value="' + context[res].fun() + '">';
	    break;
	  case 'string':
	    li += '<input type="text" value="' + context[res].fun() + '">';
	    break;
	  case 'bool':
	    li += '<input type="checkbox" value="' + context[res].fun() + '">';
	    break;
	};	
	li += '</li>';
	
	$('div#params .' + parent + ' ul.paramList').append(li);
	$('div#params .' + parent + ' ul.paramList li.' + res + ' input').keyup(function(e){
	  if(e.which == 13){
	    e.preventDefault();
	    $(this).change();
	  }
	}).change(function(){
	  $(this).prop('value', context[res].fun($(this).prop('value')));
	});	
	
	if(context[res].fixed)
	  $('div#params .' + parent + ' ul.paramList li input').addClass('fixed');
  },
  
  init: function(){
    $('#ctrl #run input').click(app.view.runClick); 
    $('#ctrl #reset input').click(app.view.resetClick);
  
	this.addParamPanel(app, 'ctrl');
	  this.updateParamList(app, 'ctrl');
    for(var res in app.res){	
	  this.addParamPanel(app.res, res);
	  //this.updateDevList(app.res, res);
	  this.updateParamList(app.res, res);	  
	}
	this.update();
  },
  
  update: function(){
    if(app.ctrl.isRunning){
	  $('#ctrl #run input').prop('value', 'Pause');
	  $('input.fixed').prop('disabled', true);
	}
	else{
	  $('input.fixed').prop('disabled', false);
	  if(app.ctrl.isReset)
	      $('#ctrl #run input').prop('value', 'Run simulation!');
	  else
	    if(app.ctrl.isFinished)
	      $('#ctrl #run input').prop('value', 'Reset and run simulation!');		
		else
	      $('#ctrl #run input').prop('value', 'Continue');
    }
	
	
	$.plot($("#plot1"), [
      { label: "SP(t)",  data: app.res.spGen.values.output.line},
      { label: "PV(t)",  data: app.res.process.values.output.line}
    ], {        
        xaxis: {
            min: 0,
            max: app.ctrl.duration
        }
    });	
  
	$('.timeValue').text(app.ctrl.values.time.val.toFixed(3)); 
	$('.spGenValue').text(app.res.spGen.values.output.val.toFixed(3)); 
	$('.processValue').text(app.res.process.values.output.val.toFixed(3));
	
  },
  
  runClick: function(){
    if(app.ctrl.isRunning)
	  app.ctrl.pause();
	else{
	  if(app.ctrl.isFinished)
	    app.ctrl.reset();
	  app.ctrl.run();	
	}
  },
  
  resetClick: function(){
    app.ctrl.reset();	
  }
};

app.ctrl = {	
  name: 'Simulator',
  
  params: {
	duration: {
	  name: 'Simulation duration [s]',
	  desc: 'Blabla.',
	  type: 'number',
	  fixed: true,
	  fun: function(value){
		if(value){
		  app.ctrl.duration = myParseFloat(value, app.ctrl.duration, 0);
          app.ctrl.kStop = app.ctrl.duration / app.ctrl.interval;		  
		}
		return app.ctrl.duration;
	  }
    },
	
	interval: {
	  name: 'Interval [s]',
	  desc: 'Blabla.',
	  type: 'number',
	  fixed: true,
	  fun: function(value){
		if(value){
		  app.ctrl.interval = myParseFloat(value, app.ctrl.interval, 0.001);
	      app.ctrl.timeout = 1000 * app.ctrl.interval / app.ctrl.boost;
          app.ctrl.kStop = app.ctrl.duration / app.ctrl.interval;		 
		}
		return app.ctrl.interval;
	  }
    }, 
	boost: {
	  name: 'Simulation boost',
	  desc: 'Blabla.',
	  type: 'number',
	  fixed: false,
	  fun: function(value){
		if(value){
		  app.ctrl.boost = myParseFloat(value, app.ctrl.boost, 0.1, 10);
		  app.ctrl.timeout = 1000 * app.ctrl.interval / app.ctrl.boost;
		}
		return app.ctrl.boost;
	  }
    },
  },	
  
  values: {
    time: { 
      val: 0,
      line: []
    }
  },
  
  duration: 60,
  interval: 0.1,
  boost: 1,
  
  isRunning: false,
  isFinished: false,
  isReset: true,
   
  run: function(){
    this.propagateInit();
    this.isRunning = true;
    this.isFinished = false;
    this.isReset = false;
	this.tick();
  },
  
  pause: function(){
	clearTimeout(this.timer);
    this.isRunning = false;	
	app.view.update();
  },
  
  reset: function(){
    this.pause();
    this.k = 0;
    this.isReset = true;
    this.propagateReset();	
	app.view.update();
  }, 
  
  k: 0,
  kStop: 600,
  timeout: 100,
  timer: null,
  tick: function(){	
	if(this.k >= this.kStop){
	  this.pause();
      this.isFinished = true;
	}
	else{
	  this.propageteExecute();
	  this.k += 1;
      this.timer = setTimeout('app.ctrl.tick()', this.timeout);
	}	
	app.view.update();
  },
  
  propagateInit: function(){
	app.res.spGen.init();
	app.res.process.init();
  },
  propageteExecute: function(){
  	this.values.time.val = this.k * this.interval;
	this.values.time.line.push(this.values.time.val);
  
	app.res.spGen.execute(this.k, this.interval);
	app.res.process.execute(this.k, this.interval, app.res.spGen.values.output.val);
  },
  propagateReset: function(){ 
    this.values.time.val = 0;
    this.values.time.line = [];  
  
	app.res.spGen.reset();
	app.res.process.reset();
  },  
};


app.res = {
  spGen: {
    name: 'Setpoint generator',	
	params: {
	  value: {
	    name: 'Initial value',
	    desc: 'Blabla.',
		type: 'number', 
		fixed: false,
		fun: function(value){
		  if(value)
		    app.res.spGen.model.value = myParseFloat(value, app.res.spGen.model.value);
		  return app.res.spGen.model.value;
		}
	  }
	},	 
	
	values: {
	  output: { 
	    val: 0,
	    line: []
	  }
	},	
	
	init: function(){},	
    execute: function(k, interval){
	  this.values.output.val = this.model.execute();
	  this.values.output.line.push(new Array(k*interval, this.values.output.val));
	},
	
	reset: function(){
	  this.values.output.val = 0;
	  this.values.output.line = [];
	},		
	
	model: {
	  value: 0,	  
	  execute: function(){
		return this.value;
	  }
	}	
  },
  
  process: {
    name: 'Process',
	
	params: {
	  num: {
	    name: 'Numerator',
	    desc: 'Blabla.',
		type: 'string',
		fixed: true,
	    fun: function(value){
		  if(value){
		    app.res.process.model.num = value.split(' ').map(function(x){
			  return myParseFloat(x, 1);
			});
		  }
		  return app.res.process.model.num.join(' ');
		}
	  },
	  
	  den: {
	    name: 'Denominator',
	    desc: 'Blabla.',
		type: 'string',
		fixed: true,
	    fun: function(value){
		  if(value){
		    app.res.process.model.den = value.split(' ').map(function(x){
			  return myParseFloat(x, 1);
			});
		  }
		  return app.res.process.model.den.join(' ');
		}
	  }
	},    
	
	values: {
	  input: { 
	    val: 0,
	    line: []
	  },
	  output: { 
	    val: 0,
	    line: []
	  },
	},
	   
	init: function(){
	  this.model.setModel(this.model.num, this.model.den);
	},	
	
    execute: function(k, interval, input){
	  this.values.input.val = input;
	  this.values.input.line.push(new Array(k*interval, input));
	  
	  this.values.output.val = this.model.execute(input, interval);
	  this.values.output.line.push(new Array(k*interval, this.values.output.val));
	},
	
	reset: function(){
	  this.values.input.val = 0;
	  this.values.input.line = [];
	  this.values.output.val = 0;
	  this.values.output.line = [];
	},
	
    model: {  
	  num: [1],
	  den: [5, 1],
	
      setModel: function(num, den, delay){	
	    this.model.A = [];
	    this.model.B = [];
	    this.model.C = [];
	    this.model.D = 0;
	    var rank = den.length - 1;
	    var zeros = [];
	    for(var i = 0; i < rank; i++)
	      zeros[i] = 0;	
		
	    num = MulS(num, 1/den[0]);
		num.reverse();
	    num = num.concat(zeros).slice(0, rank+1);
	    den = MulS(den, 1/den[0]);	
        den.reverse();		
	  
	    for(var i = 0; i < rank-1; i++){
          this.model.A[i] = zeros.slice();
		  this.model.A[i][i+1] = 1;
	    }
	    this.model.A[rank-1] = MulS(den.slice(0, rank), -1);
	  
	    this.model.B = zeros.slice();	  
	    this.model.B[rank-1] = 1;
	  
	    this.model.C = Sum(num.slice(0, rank), MulS(this.model.A[rank-1], -1 * num[rank]));
	  
	    this.model.D = num[rank];
	  
	    this.state = zeros.slice();			
	  },
  
	  model: {
	    A: [],
        B: [],
        C: [],
        D: 0,
        h: 0      	  
	  },
	
      state: [],
    
	  execute: function(input, interval){
	    var res = MulV(this.model.C, this.state) + this.model.D * input;
	    this.state = app.res.solver.model.solve(input, this.model, this.state, interval);
	    return res;
	  }
    }
  },  
  
  controller: {
    name: 'Controller',	
	params: {
	},	  	  
	values: {
	},	
	init: function(){},	
    execute: function(k, interval){},
	reset: function(){},		
	model: {}	
  },
  
  disturbanceGen: {
    name: 'Disturbance generator',	
	params: {
	},	  	  
	values: {
	},	
	init: function(){},	
    execute: function(k, interval){},
	reset: function(){},		
	model: {}	
  },
  
  sensor: {
    name: 'Sensor',	
	params: {
	},	  	  
	values: {
	},	
	init: function(){},	
    execute: function(k, interval){},
	reset: function(){},		
	model: {}	
  }, 
  
  solver: {
    name: 'Solver',
  
    model: {
      solve: function(input, model, state, Tp){
        var k1 = [];
        var k2 = [];
        var k3 = [];
        var k4 = [];	
		
	    for(var i in state)
	      k1[i] = MulV(model.A[i], state) + model.B[i] * input;	
	    for(var i in state)
	      k2[i] = MulV(model.A[i], Sum(state, MulS(k1, 0.5 * Tp))) + model.B[i] * input;		
	    for(var i in state)
	      k3[i] = MulV(model.A[i], Sum(state, MulS(k2, 0.5 * Tp))) + model.B[i] * input;		
	    for(var i in state)
	      k4[i] = MulV(model.A[i], Sum(state, MulS(k3, Tp))) + model.B[i] * input;
		
	    return Sum(state, MulS(Sum(k1, MulS(k2, 2), MulS(k3, 2), k4), 0.16667 * Tp));
      }		
    }
  }
};