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
        db.connect('db', ['baydb']);
        var query = {id:indata.bayid};
        var getdata = db.baydb.findOne(query);

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
        
        db.storydb.save(postw);

        db.connect('db', ['baydb']);
        var query = {id:postw.bayid};
        var findbay= db.baydb.findOne(query);
        console.log(postw);
        console.log(findbay);
        findbay.storys.push(postw);
        
        db.baydb.update(query,{storys:findbay.storys});
        // console.log(db.baydb.find());
        res.json({data:postw});   
    });

    app.get('/storybyid', function(req, res){
        var indata = JSON.parse(req.query.id);
        db.connect('db', ['storydb']);
        console.log(db.storydb.findOne({id:indata.id}));
        var rdata=db.storydb.findOne({id:indata.id});
        res.send({data:rdata});
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

    app.delete('/workspaces/:id', function(req, res) {
        db.connect('db', ['workspaces']);
        var query = {id:req.params.id};
        var deldata = db.workspaces.findOne(query);
        db.workspaces.remove(query,false); 
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
        // fs.readFile(workspacesDB,'utf-8',function(err,data){  
        //     if(err){  
        //         console.log("error");  
        //     }else{ 
        //         console.log(req.params); 
        //         var i=1;
        //         var wsDB = JSON.parse(data);
        //         var postw = req.body;
        //         if (wsDB.length === 0){
        //             postw.id=1;
        //         }else{
        //             postw.id=wsDB[wsDB.length-1].id+1;
        //         }
        //         postw.path='works/'+postw.owner+'/'+postw.id;
        //         wsDB.push( postw);
        //         fse.ensureDirSync(postw.path);
        //         fs.writeFile(workspacesDB, JSON.stringify(wsDB), function(err){  
        //             if(err) {
        //                 console.log("fail " + err);  
        //             }else{  
        //                 console.log("write file ok"); 
        //                 res.json(wsDB);}
        //         });  
        //     }
        // });    
    });
//--------------regs-start------------------------------
    // Add new Regarray
    var regsDB = 'db/regsdb.txt';
    app.get('/regs', function(req, res){
        db.connect('db', ['regs']);
        var query = {visable:true};
        // var query1 = {visable:true,owner:req.query.user};
        // var query2 = {share:true};
        // var owenerdata=db.regs.find(query1)
        // console.log(db.regs.find());
        // console.log(owenerdata);
        //var backdata = db.regs.find()
        var backdata = db.regs.find(query).filter(function(f){return f.owner ===req.query.user || f.share===true;});
        // backdata=backdata.concat(owenerdata)
        console.log(backdata);
        
        // console.log(db.regs.find());
        res.json(backdata); 
        // fs.readFile(regsDB,'utf-8',function(err,data){  
        //     if(err){  
        //         console.log(err);     
        //         // throw err;
        //     }else{ 
        //         res.send(data);        
        //     }
        // }); 
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
        console.log(db.userdb.find());
        res.json({data:postw});   
    });

    // var regArray = [
    //         {id:1,enable:true,regScope : 'atest.',regScopeAttr : 'g',regFind : 'aaa',regFindAttr : 'i',regReplace : 'ReplaceA'},
    //         {id:2,enable:true,regScope : 'btest..',regScopeAttr : 'g',regFind : 'bbb',regFindAttr : 'i',regReplace : 'ReplaceBB'},
    //         {id:3,enable:true,regScope : 'ctest...',regScopeAttr : 'g',regFind : 'ccc',regFindAttr : 'i',regReplace : 'ReplaceCCC'}
    //         ];
    // var rapper = {id:1,workSpace:'AAA',file:'./uploads/readme.txt',regArray:regArray};

    app.get('/rep', function(req, res){
        
      var filer = JSON.parse(req.query.file);
      var file= filer.path ;
      console.log(filer);
      var regArray = JSON.parse(req.query.regs);
        fs.readFile(file,'binary',function(err,data){  
        if(err){  
            console.log("error");  
        }else{  
            // var delimiter='\n';
            // switch(filer.encoding){
            //     case 'utf8':
            //     case 'utf-8':
            //         delimiter='\n';
            //         break;
            //     case 'utf-8':
            //         delimiter='\r\n';
            //         break;
            // }
            var out = data;
            var outf = data;
            // var outff = iconv.decode(data, 'ascii');
            // console.log('1--'+out);
            // console.log('2--'+outff);
            // var filea = data.split(delimiter);
            //var regExp1 = /.*\r\n/g;
            // var regExp1 = new RegExp('.*'+delimiter,'g');
            // var x=0;
            // var rowtbl=[];
            // while((row=regExp1.exec(data)) !== null)
            // {   //console.log(row);
            //     rowtbl[x]=row.index;
            //     x++;
            // }
            var result;
            //console.log('-->'+rowtbl); 
                for (j=0; j < regArray.length; ++j) {
                    //console.log('-->'+regArray[j].enable); 
                    if (regArray[j].enable){
                        // if (regArray[j].regScope,regArray[j].regScopeAttr.value !== 'cg'){
                            var regExpScope = new RegExp(regArray[j].regScope,regArray[j].regScopeAttr.value);
                            var regExpScopeR = new RegExp(regArray[j].regScope,'');
                            regExpScope.lastIndex=0;
                            regExpScopeR.lastIndex=0;
                            while ((result=regExpScope.exec(out)) !== null)  {
                                var row=result[0].toString();
                                for (k=0; k < regArray[j].findArray.length; ++k) {
                                    var regExpFind = new RegExp(regArray[j].findArray[k].regFind,regArray[j].findArray[k].regFindAttr.value);
                                    regExpFind.lastIndex=0;
                                    //console.log(regExpScope.exec(out));
                                    //console.log('I:'+result.index+"|"+regExpFind + "F/R" +regArray[j].regReplace);
                                    row = row.replace(regExpFind,regArray[j].findArray[k].regReplace);
                                    //console.log('f-->'+filea[f]);
                                }
                                // var f = rowtbl.findIndex(function (element) {
                                //         return element == result.index;
                                //     });
                                // filea[f]= row;
                                // console.log(regExpScopeR);
                                //console.log(row);
                                // console.log(regExpScopeR.lastIndex);
                                outf = outf.replace(regExpScopeR,row);
                            }
                        //}
                        // else{
                        //     // regArray[j].regScopeAttr.value=regArray[j].regScopeAttr.value.replace(/c/,'')
                        //     var regExpScope = new RegExp(regArray[j].regScope,regArray[j].regScopeAttr.value);
                        //     console.log(regExpScope);
                        //     result=regExpScope.exec(out);
                        //     for (k=0; k < regArray[j].findArray.length; ++k) {
                        //             var regExpFind = new RegExp(regArray[j].findArray[k].regFind,regArray[j].findArray[k].regFindAttr.value);
                        //             regExpFind.lastIndex=0;
                        //             //console.log(regExpScope.exec(out));
                        //             //console.log('I:'+result.index+"|"+regExpFind + "F/R" +regArray[j].regReplace);
                                    
                        //             outf = outf.replace(regExpFind,regArray[j].findArray[k].regReplace);
                                    
                        //             //console.log('f-->'+filea[f]);
                        //     }
                        //     //console.log(result.toString());
                        //     if(result)
                        //         console.log(result.toString());
                        // }
                        //console.log(filea);
                    }
                }
                //console.log(filea);
                console.log(filer.convPath);  
                var fileOut = filer.convPath; //'./test/readme.txt'; 
                //var arr=filea.join(delimiter);
                var arr=outf;
                var opt={encoding: 'binary'};
                //console.log(arr)
                fs.exists(fileOut,function(exists){  
                    if(exists){  
                        fs.unlink(fileOut, function(err){
                            if(err){
                                console.log(err);
                                //throw err;
                            }
                                console.log('file:'+fileOut+' deleted');

                                fs.appendFile(fileOut, arr,opt, function(err){  
                                    if(err) { 
                                        console.log("fail " + err);  
                                    }else{  
                                        console.log("write file ok");
                                        filer.convFlag = true;
                                        res.send(filer);}  
                                });  
                                
                            }); 
                    }else{  
                        fs.appendFile(fileOut, arr,opt, function(err){  
                                    if(err) { 
                                        console.log("fail " + err);  
                                    }else{  
                                        console.log("write file ok");
                                        filer.convFlag = true;
                                        res.send(filer);}  
                                }); 
                    }  
                });  
            }  
        });  
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