    var express = require('express'); 
    var app = express(); 
    var bodyParser = require('body-parser');
    var multer = require('multer');
    var rf=require("fs");  
    var zlib = require('zlib'); 
    var gzip = zlib.createGzip(); 
    var fstream = require('fstream');
    var tar = require('tar');




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
            cb(null, file.originalname);
        }
    });

    var upload = multer({ //multer settings
                    storage: storage
                }).single('file');

    
    app.post('/upload', function(req, res) {
        upload(req,res,function(err){
			console.log(req.file);
            if(err){
                 res.json({error_code:1,err_desc:err});
                 return;
            }
             res.json({error_code:0,err_desc:null,destination:req.file.destination,filename:req.file.filename,path:req.file.path});
        });
    });

    app.get('/download', function(req, res){
        var fileDownload = './'+rapper.workSpace; 
        // var inp = rf.createReadStream(fileDownload); 
        // var out = rf.createWriteStream(workSpace.name+'.gz'); 
        // inp.pipe(gzip).pipe(out); 
        fstream.Reader({ 'path': fileDownload, 'type': 'Directory' }) /* Read the source directory */
        .pipe(tar.Pack()) /* Convert the directory to a .tar file */
        .pipe(zlib.Gzip()) /* Compress the .tar file */
        .pipe(fstream.Writer({ 'path': rapper.workSpace+'.tar.gz' }));
        res.download(rapper.workSpace+'.tar.gz'); // Set disposition and send it.
    });


    // app.get('/', function(req, res){
    //   res.send(`<ul> 
    //      <li>Download <a href="/uploads/file-1484452575347.JCL">file1</a>.</li>
    //      <li>Download <a href="/uploads/file-1484452585234.JPG">missing.txt</a>.</li>
    //      </ul> `);
    // });

    var regArray = [
            {id:1,enable:true,regScope : 'atest.',regScopeAttr : 'g',regFind : 'aaa',regFindAttr : 'i',regReplace : 'ReplaceA'},
            {id:2,enable:true,regScope : 'btest..',regScopeAttr : 'g',regFind : 'bbb',regFindAttr : 'i',regReplace : 'ReplaceBB'},
            {id:3,enable:true,regScope : 'ctest...',regScopeAttr : 'g',regFind : 'ccc',regFindAttr : 'i',regReplace : 'ReplaceCCC'}
            ];
    var rapper = {id:1,workSpace:'AAA',file:'./uploads/readme.txt',regArray:regArray};

    app.get('/rep', function(req, res){

      var file = rapper.file 

        rf.readFile(file,'utf-8',function(err,data){  
        if(err){  
            console.log("error");  
        }else{  
            var out = data;
            var filea = data.split('\r\n');
            var regExp1 = /.*\r\n/g;
            var re1 = /[^ad]test./g;
            var re2 = /[^bc]test./g;
            
            var x=0;
            var rowtbl=[];
            while((row=regExp1.exec(data)) !== null)
            {   console.log(row);
                rowtbl[x]=row.index;
                x++;
            }
            console.log(rowtbl);

            var result;
                for (j=0; j < regArray.length; ++j) {
                    if (regArray[j].enable){
                        var regExpScope = new RegExp('.*'+regArray[j].regScope,regArray[j].regScopeAttr);
                        regExpScope.lastIndex=0;
                        var regExpFind = new RegExp(regArray[j].regFind,regArray[j].regFindAttr);
                        regExpFind.lastIndex=0;
                        while ((result=regExpScope.exec(out)) !== null)  {
                            var row=result.toString();
                            var newrow = row.replace(regExpFind,regArray[j].regReplace);
                            var f = rowtbl.findIndex(function findrow(element) {
                                return element == result.index;
                            });
                            console.log(result.index);
                            console.log(f);
                            filea[f]= newrow;
                        }
                    }
                }
            console.log(filea.toString());  
            var fileOut = './'+rapper.workSpace +"/readme.txt"; 
            var arr=filea.join("\r\n");
            rf.unlink(fileOut, function(err){
            if(err){
                throw err;
            }
                console.log('file:'+fileOut+' deleted');
            
                rf.appendFile(fileOut, arr, function(err){  
                    if(err)  
                        console.log("fail " + err);  
                    else  
                        console.log("write file ok");  
                });  
                res.send(arr);
            })
            
        }  
        
        
        });  

      //res.download(path);
        
    });

    // /files/* is accessed via req.params[0]
    // but here we name it :file
    app.get('/:file(*)', function(req, res, next){
      var file = req.params.file;
      var path = __dirname + '/' + file;

      res.download(path);
    });

    app.listen('3100', function(){
        console.log('running on 3100...');
    });