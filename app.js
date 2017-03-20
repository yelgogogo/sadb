    var express = require('express'); 
    var app = express(); 
    var bodyParser = require('body-parser');
    var multer = require('multer');
    var fs=require("fs");  
    var fse = require('fs-extra');
    var zlib = require('zlib'); 
    var gzip = zlib.createGzip(); 
    var fstream = require('fstream');
    var tar = require('tar');
    var db = require('diskdb');
    // var iconv = require('iconv-lite');



    app.use(function(req, res, next) { //allow cross origin requests
        res.setHeader("Access-Control-Allow-Methods", "POST, PUT, OPTIONS, DELETE, GET");
        res.header("Access-Control-Allow-Origin", "http://localhost:4200");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.header("Access-Control-Allow-Credentials", true);
        next();
    });

    /** Serving from the same express Server
    No cors required */
    app.use(express.static('../client'));
    app.use(bodyParser.json());  

    var storage = multer.diskStorage({ //multers disk storage settings
        destination: function (req, file, cb) {
            cb(null, './uploads/');
        },
        filename: function (req, file, cb) {
            var datetimestamp = Date.now();
            console.log(file);
            cb(null, file.originalname+'-' + datetimestamp);
        }
    });

    var upload = multer({ //multer settings
                    storage: storage
                }).single('file');

    
    app.post('/upload/', function(req, res) {
        upload(req,res,function(err){
			console.log(req.file);
            if(err){
                res.json({error_code:1,err_desc:err});
                return;
            }
            var createTime = new Date();
            res.json({error_code:0,err_desc:null,createTime:createTime.toLocaleString(),destination:req.file.destination,filename:req.file.filename,path:req.file.path});
        });
    });

    app.get('/bay', function(req, res){
      var indata = JSON.parse(req.query.user);
      db.connect('db', ['storydb']);
      var query = {bayid:Number(indata.bayid)};
      var storyarr = db.storydb.find(query);

        db.connect('db', ['baydb']);
        query = {id:Number(indata.bayid)};
        var getdata = db.baydb.findOne(query);
        
        getdata.storys.forEach(function(baysty,index){
          getdata.storys[index]=storyarr.find(function(fsty){return fsty.id===baysty.id;});	
        });
        console.log(getdata.storys);
        getdata.storys=getdata.storys.filter(function(f){
          return f.delflag!==true;
        });
        // console.log(getdata.storys);
        res.json({data:getdata});       
    });

    app.put('/bay/:id', function(req, res) {
        db.connect('db', ['baydb']);
        var putdata = req.body;
        var query = {id:Number(req.params.id)};
        db.baydb.update(query,putdata);
        var getdata = db.baydb.findOne(query);
        res.json({data:getdata}); 
    });

    app.get('/mybay', function(req, res){
      var indata = JSON.parse(req.query.user);
        db.connect('db', ['baydb']);
        console.log(indata);
        var query = {id:Number(indata.bayid)};
        var getdata = db.baydb.findOne(query);
        delete getdata.storys;
        res.json({data:getdata});       
    });

    app.get('/story', function(req, res){
        db.connect('db', ['storydb']);
        var getdata = db.storydb.find();

        res.json({data:getdata});       
    });

    //add new story
    app.post('/story', function(req, res) {
        db.connect('db', ['storydb']);
        console.log(req.body); 
        var postw = req.body; 
        postw.id = db.storydb.count() + 1;
        // postw.description=postw.description.replace(/\n/g,'\r\n');
        db.storydb.save(postw);

        db.connect('db', ['baydb']);
        var query = {id:Number(postw.bayid),delflag:false};
        var findbay= db.baydb.findOne(query);
        // console.log(postw);
        // console.log(findbay);
        // console.log(query);
        // console.log(db.baydb.findOne());
        findbay.storys.push(postw);
        
        db.baydb.update(query,{storys:findbay.storys});
        // console.log(db.baydb.find());
        res.json({data:postw});   
    });

    app.get('/storybyid', function(req, res){
        var indata = JSON.parse(req.query.id);
        db.connect('db', ['storydb']);
        console.log(db.storydb.findOne({id:indata.id,delflag:false}));
        var rdata=db.storydb.findOne({id:indata.id,delflag:false});
        res.send({data:rdata});
    });

    //soft delte story
    app.delete('/story/:id', function(req, res) {
      var indata = JSON.parse(req.query.parm).user;
      db.connect('db', ['storydb']);

      var query = {id:Number(req.params.id)};
      var deldata = db.storydb.findOne(query);
      console.log(query);
      console.log(deldata);
      options = {
        multi: false, // update multiple - default false 
        upsert: true // if object is not found, add it (update-insert) - default false 
	  };
	  // console.log(indata,deldata.ownerid);
	  if (deldata){
	  	if (Number(indata.id)===deldata.ownerid){
      	  db.storydb.update(query,{delflag:true},options); 
      	  console.log(db.storydb.findOne(query));
      	}
	  }
      
      deldata = db.storydb.findOne(query);
      // db.connect('db', ['baydb']);
      // var query = {id:Number(deldata.bayid)};
      // var findbay= db.baydb.findOne(query);
      // var i=findbay.storys.findIndex(
      // 	function(x) { return x.id === deldata.id; }
      // 	);
      // console.log(i);
      // findbay.storys[i]=deldata;
      // db.baydb.update(query,{storys:findbay.storys});
      // console.log(db.baydb.findOne(query).storys[i]);
      res.json({data:deldata}); 
      

    });

    //add new story
    app.post('/comment', function(req, res) {
        var postw = req.body; 
        db.connect('db', ['storydb']);
        var query = {id:postw.storyid};
        var findstory= db.storydb.findOne(query);
        if(findstory.comments){
            postw.id=findstory.comments.length + 1;
        }else{
            postw.id=1;
            findstory.comments=[];
        }
        
        findstory.comments.push(postw);
        // console.log(findbay.storys);
        db.storydb.update(query,{comments:findstory.comments});
        // console.log(db.baydb.find());
        db.connect('db', ['commentdb']);
        db.commentdb.save(postw);

        res.json({data:findstory});   
    });

    var workspacesDB = 'db/workspacesdb.txt';
    app.put('/workspaces/:id', function(req, res) {
        db.connect('db', ['workspaces']);
        var putdata = req.body;
        var query = {id:req.params.id};
        db.workspaces.update(query,putdata);
        res.json(putdata); 
    });

    

    app.post('/workspaces', function(req, res) {
        db.connect('db', ['workspaces']);
        var postdata = req.body;
        wsDB=db.workspaces.find();
        if (wsDB.length === 0){
            postdata.id=1;
        }else{
            postdata.id=wsDB[wsDB.length-1].id+1;
        }
        postdata.path='works/'+postdata.owner+'/'+postdata.id;
        db.workspaces.save(postdata);
        fse.ensureDirSync(postdata.path);
        //console.log(postdata);
        res.json(db.workspaces.find());   
    });
//--------------regs-start------------------------------
    // Add new Regarray
    var regsDB = 'db/regsdb.txt';
    app.get('/regs', function(req, res){
        db.connect('db', ['regs']);
        var query = {visable:true};
        var backdata = db.regs.find(query).filter(function(f){return f.owner ===req.query.user || f.share===true;});
        console.log(backdata);
        res.json(backdata); 
    });
    // Update existing Regarray
    app.put('/regs/:wid', function(req, res) {
        db.connect('db', ['regs']);
        var postw = req.body;
        var query = {id:req.params.wid};
        db.regs.update(query,postw);
        res.json(postw); 
    });

    app.delete('/regs/:did', function(req, res) {
        db.connect('db', ['regs']);
        var query = {id:Number(req.params.did)};
        res.json(db.regs.update(query,{visable:false}));   
    });


//--------------regs-end------------------------------
    app.get('/download', function(req, res){
        var downzip = JSON.parse(req.query.workspace);
        var fileDownload = downzip.path; 
        var zippath=fileDownload+'-'+downzip.name+'.tar.gz';
        // var inp = fs.createReadStream(fileDownload); 
        // var out = fs.createWriteStream(workSpace.name+'.gz'); 
        // inp.pipe(gzip).pipe(out); 
        fstream.Reader({ 'path': fileDownload, 'type': 'Directory' }) /* Read the source directory */
        .pipe(tar.Pack()) /* Convert the directory to a .tar file */
        .pipe(zlib.Gzip()) /* Compress the .tar file */
        .pipe(fstream.Writer({ 'path': zippath }));
        downzip.zippath=zippath;
        res.download(zippath); // Set disposition and send it.
        console.log(zippath+' downloaded!');
        res.send(downzip);
    });



    app.get('/users', function(req, res){
        db.connect('db', ['userdb']);
        //console.log(db.users.find());
        res.send(db.userdb.find());
    });

    app.put('/users/:id', function(req, res) {
        db.connect('db', ['userdb']);
        var putdata = req.body;

        var query = {id:Number(req.params.id)};
        console.log(query);
        console.log(db.userdb.find());
        db.userdb.update(query,putdata);
        var getdata = db.userdb.findOne(query);
        console.log(getdata);
        res.json({data:getdata}); 
    });

    app.get('/userbyname', function(req, res){
        var indata = JSON.parse(req.query.user);
        db.connect('db', ['userdb']);
        console.log(db.userdb.findOne({name:indata.name,password:indata.password}));
        var rdata=db.userdb.findOne({name:indata.name,password:indata.password});
        delete rdata.password;
        res.send({data:rdata});
    });  

    app.post('/users', function(req, res) {
        db.connect('db', ['userdb']);
        var postw = req.body;
        postw.id = db.userdb.count() + 1;
        db.userdb.save(postw);
        db.connect('db', ['baydb']);
        var query = {id:Number(postw.bayid)};
        var fdata=db.baydb.findOne(query);
        fdata.people.push(postw);
        db.baydb.update(query,{people:fdata.people});
        // console.log(db.baydb.find());
        res.json({data:postw});   
    });

    app.get('/repairstory/:id', function(req, res){
      var indata = JSON.parse(req.params.id);
      db.connect('db', ['userdb']);
      var alluser=db.userdb.find();

        db.connect('db', ['storydb']);
        var rstory=db.storydb.findOne({id:Number(indata.id)});
        if (rstory.owner){
	      var fusr=alluser.find(function(usr){
      	  	return usr.name===rstory.owner;
	      });
	      rstory.ownerid=fusr.id;
    	}else{
    	  rstory.ownerid=1;	
    	}
        
        res.send({data:rstory});
    });

    // /files/* is accessed via req.params[0]
    // but here we name it :file
    app.get('/:file(*)', function(req, res, next){
      var file = req.params.file;
      var path = __dirname + '/' + file;
      var folder1 = file.match(/[^\\\/]+/);
      switch (folder1.toString())
      {
        case 'works':
        case 'uploads':
            console.log(path+' download!');
            res.download(path);
            break;
      }
    });

    app.delete('/delconvf', function(req, res){
        var filer = JSON.parse(req.query.file);
        console.log(filer);
        var file = filer.convPath;
        var path = __dirname + '/' + file;
        var folder1 = file.match(/[^\\\/]+/);
        //var deletef = JSON.parse(req.body);
        switch (folder1.toString()) {
        case 'works':
        case 'uploads':
            fs.exists(path,function(exists){  
                if(exists){  
                    fs.unlink(path, function(err){
                        if(err){
                            console.log(err);
                            //throw err;
                        }else{
                            console.log('file:'+path+' deleted!'); 
                            filer.convFlag = false;
                            res.send(filer);
                        }
                    });
                }else{
                    console.log('file:'+path+' not exist!'); 
                    filer.convFlag = false;
                    res.send(filer);
                }
            }); 
            break;
        }
        // filer.convFlag = false;
        // res.send(filer);
    });

    app.listen('3200', function(){
        console.log('running on 3200...');
    });