const mongoose=require('mongoose')
const nodemailer = require("nodemailer");
const Schema=mongoose.Schema;

const blogSchema=new Schema({
    title:{type:String, required:true},
    snippet:{type:String, required:true},
    body:{type:String, required:true},
    imageUrl:{type:String, required:false, default:"https://source.unsplash.com/random/200x200?sig=1"},
    videoUrl:{type:String, required:false, default:"http://techslides.com/demos/sample-videos/small.mp4"},

},{timestamps:true});

//when saved in db , mail is sent
blogSchema.post('save', async (doc)=>{
    try{

        //transporter
        let testaccount=await nodemailer.createTestAccount();
        const transporter = nodemailer.createTransport( {
            host:process.env.MAIL_HOST,
            port:587,
            auth:{
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }
        })

        //send mail
        const info = await transporter.sendMail({
            from:'Himanshu Patil- Admin',
            to:process.env.MAIL_USER,
            subject:"New file uploaedd on cloudinary",
            html:`<h1>UPLOAD SUCCESSFUL</h1>`
        })

    }
    catch(err){
        console.log(err);
    }
})


// first argument is th.e name which it should search for in the database : Second argument is the schema/ type of object to should store in database
const Blog=mongoose.model('Blog', blogSchema);

module.exports=Blog; 


