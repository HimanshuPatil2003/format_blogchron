const express= require('express');
const app= express();
const mongoose=require('mongoose');
const Blog =require('./models/blog')

//package to read values from .env
require("dotenv").config();

//setting view engine as ejs
app.set('view engine', 'ejs');

//third party middleware
const morgan=require('morgan'); // prints request+response info in console
app.use(morgan('dev')); // not necessary
const fileupload = require("express-fileupload");
app.use(fileupload({
    useTempFiles : true, // uploaded files are stored tempo. on disk raher than on memory while uploading
    tempFileDir : '/tmp/' // path of directory where the file is tempo. stored
}));
app.use(express.json());


const dbURI='mongodb://localhost:27017/blogImageNew'

app.listen(300);
//connecting database
mongoose.connect(dbURI, {useNewUrlParser:true , useUnifiedTopology:true})
.then((result)=> console.log('connected to db'))
.catch((err)=> console.log(err))

const cloudinaryM = require("./config/cloudinary");
cloudinaryM.cloudinaryConnect();




//using inbuilt middleware to serve the static files to frontend
app.use(express.static('public'));
app.use(express.urlencoded({extended:true}));   //used for accepting form data in backend imp

const cloudinary = require("cloudinary").v2;


//ROUTES
app.get('/',(req,res)=>{
    res.redirect('/home')
})

app.get('/favicon.ico', (req, res) => res.status(204).end());




app.get('/home', (req,res) =>{
    res.render('home') //parallax page
})

app.get('/about',(req,res)=>{ 
    res.render('about' , {title:'About'})
})

app.get('/blog/create', (req,res) =>{
    res.render('create',{title:'Create Blog'})
})


app.get('/blogs', (req,res)=>{
    Blog.find().sort({createdAt:-1})
    .then((result)=>{
        res.render('index', {title: 'All Blogs', blogs: result})
    })
    .catch((err)=>{
        console.log(err);
    })
})

async function uploadFileToCloudinary(file, folder){
    const options = {folder, timeout:60000};
    // console.log("TempFilePath", file.tempFilePath);
    
    // console.log(options);
    options.resource_type = "auto"; 
    return await cloudinary.uploader.upload(file.tempFilePath, options); // application will buffer/pause till file is not uploaded to colud due to await
}

//saving data to the mongodb
app.post('/blogs',async(req,res)=>{
    // when form of new blog creation page is submitted, data comes here
    console.log(req);
    const {title,snippet, body} = req.body;
    let imagefile;
    let hasimage,hasvideo;
    if(req.files && req.files.image) {
        imagefile = req.files.image;
        hasimage=true;
    }
    let videofile;
    if(req.files && req.files.video){
        videofile= req.files.video;
        hasvideo=true;
    } 
    let imagelink,videolink; //to store links of secureurl returned on saving to cloudinary 
    // console.log(title);
    // console.log(snippet);
    // console.log(body);
    // console.log(imagefile);
    // console.log(videofile);
    //saving it to the database


    //UPLOAD IMAGE TO CLOUDINARY
    try{

        if (req.files && req.files.image) {
             imagefile = req.files.image;
             imagelink = await uploadFileToCloudinary(imagefile, "himanshu");
            console.log("Image Response :",imagelink);     
        }  

    }
    catch(err){
        console.log(err);
        return res.status(400).json({
            success:false,
            message:'Something went wrong in uploading image file'
        })
    }

    //video upload to cloudinary
    try{
        
        if (req.files && req.files.video) {
             videofile = req.files.video;
             videolink = await uploadFileToCloudinary(videofile, "himanshu");
            console.log("Video Response :" ,videolink); 
        }           

    }
    catch(err){
        console.log(err);
        return res.status(400).json({
            success:false,
            message:'Something went wrong in uploading video file'
        })
    }


    // LOCAL SERVER UPLOAD FOR IMAGE
    try{

        
        if (hasimage) {
            //create path where need to be stored on server
            let path = __dirname + "/imageFiles/"+ Date.now() + `.${imagefile.name.split('.')[1]}`// + extension
            // console.log("PATH", path);

            //add path to the move function
            imagefile.mv(path, (err)=>{
                console.log(err);   
            });
        }
    }
    catch(err){
        console.log(err);
    }


    // LOCAL SERVER UPLOAD FOR VIDEO
    try{
        
        if (hasvideo) {
            //create path where need to be stored on server
            let path = __dirname + "/videoFiles/"+ Date.now() + `.${videofile.name.split('.')[1]}`// + extension
            // console.log("PATH", path);

            //add path to the move function
            videofile.mv(path, (err)=>{
                console.log(err);   
            });
        }
        
    }
    catch(err){
        console.log(err);
    }

    if(hasimage && hasvideo){
        //make FINAL entry in database
        const fileData = await Blog.create({
            title,snippet, body,
            imageUrl:imagelink.secure_url,
            videoUrl:videolink.secure_url,
        })
        .then((result)=>{
            res.redirect('/blogs');
        })
        .catch((err)=>{
            console.log(err);
        })
    }else{
        //make FINAL entry in database
        const fileData = await Blog.create({
            title,snippet, body,
            
        })
        .then((result)=>{
            res.redirect('/blogs');
        })
        .catch((err)=>{
            console.log(err);
        })
    }

})

app.get('/blogs/:id',(req,res)=>{
    const id=req.params.id;
    Blog.findById(id)
    .then(result=>{
        res.render('details', {blog : result , title:'Blog Details'})
    })
    .catch(err=>{
        console.log(err);
    })

})

app.delete('/blogs/:id',(req,res)=>{
    const id=req.params.id;
    Blog.findByIdAndDelete(id)
    .then(result=>{
        res.json( {redirect:  '/blogs' })
    })
    .catch(err=>{
        console.log(err);
    })
})


app.get('/blogs/:id/edit', (req, res) => {
    const id = req.params.id;
    Blog.findById(id)
    .then(result => {
        res.render('edit', { blog: result, title: 'Edit Blog' });
    })
    .catch(err => {
        console.log(err);
        res.status(404).send('Blog not found');
    });
});



app.post('/blogs/:id', async (req, res) => {
    const id = req.params.id;
    const { title, snippet, body } = req.body;
    let updatedData = { title, snippet, body };

    try {
        // Check if a new image or video is uploaded, then upload to Cloudinary
        if (req.files && req.files.image) {
            const imagefile = req.files.image;
            const imagelink = await uploadFileToCloudinary(imagefile, "himanshu");
            updatedData.imageUrl = imagelink.secure_url;
        }
        if (req.files && req.files.video) {
            const videofile = req.files.video;
            const videolink = await uploadFileToCloudinary(videofile, "himanshu");
            updatedData.videoUrl = videolink.secure_url;
        }

        // Find the blog by ID and update with new data
        const updatedBlog = await Blog.findByIdAndUpdate(id, updatedData, { new: true });

        res.redirect(`/blogs`);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Failed to update blog' });
    }
});



//search
app.post("/search",async(req,res)=>{
    try{                              
         
      console.log(" in search method ") ;
      console.log(req.body) ;

      //input string
      const midstringtitle = req.body.searchInput ;
      const midstringsnippet = req.body.searchInput ;  
      const midstringbody = req.body.searchInput ;
        console.log(req.body)
      console.log(" before 3 regex patterns");

      //creating regular expression to 
      const regexPattern = new RegExp(`.*${midstringtitle}.*`,'i') ; //i-> flag for disabling case sensitivity 
      console.log(regexPattern);
      const regexPattern1 = new RegExp(`.*${midstringsnippet}.*`,'i') ;      
      const regexPattern2 = new RegExp(`.*${midstringbody}.*`,'i') ;
                                                                                                       
      existingTitle = await Blog.find({ title : {$regex: regexPattern }}) ;
      existingSnippet = await Blog.find({snippet : {$regex: regexPattern1 }}) ;
      existingBody = await Blog.find({ body :  {$regex: regexPattern2 }}) ;  

      const combinedResults = existingTitle.concat(existingSnippet , existingBody);
    //   console.log(" map print ");
    //   console.log(Array.from(combinedResults.map(id => combinedResults.find(result => result._id === id))));
      // Remove duplicates based on a unique identifier (e.g., _id)
      const uniqueResults = Array.from(new Set(combinedResults.map(result => result.title)))
                                 .map(title => combinedResults.find(result => result.title === title));
     if(uniqueResults){
       console.log("printing unique results", uniqueResults);
       
      
     
    // const topicsFromBlogs = uniqueResults.map(blog => blog.topic);
    let sortedHighOrderBlogs = [];
    let sortedLowOrderBlogs = [];


     // ?? Compare with the list of topics (since topic doesnt exist compare with titles but change it ???)
     uniqueResults.forEach(result => {
         sortedHighOrderBlogs.push(result) ;
         console.log(`Topic '${result.title}' is in the list.`);
         
        // sortedLowOrderBlogs.push(result);
        //  console.log(`Topic '${result.title}' is not in the list.`);
     });
     sortedBlogs = sortedHighOrderBlogs.concat(sortedLowOrderBlogs);
     console.log(" printing all blogs going back to search screen ");
     console.log(" printing end searched results", sortedBlogs);


      res.send(sortedBlogs); // Send the actual data from the database
      
    }
    else {
          console.log("Topic could not be found");
          res.status(404).send("Topic could not be found");
      }        
   }
   catch{
          console.error("Error in search route:");
          res.status(500).send("Internal Server Error");
   }

})







app.use((req,res)=>{
    res.status(404).render('404',{title: '404'})
})

 