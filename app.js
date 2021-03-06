const express=require('express');
const passport=require('passport');
const bodyParser=require('body-parser');
var Strategy = require('passport-local').Strategy;
const session=require('express-session');
const mysql=require('mysql');
const bcrypt = require('bcryptjs');
const flash=require('connect-flash');
const ejs=require('ejs');
const app=express();
const conn=mysql.createConnection({
    host:'localhost',
    user: 'root',
    password: 'sanjana123',
    database: 'copyright'
});
app.set('view engine','ejs');
app.use(express.static('public'));
app.use(session({
    secret:'secret',
    resave: false,
    saveUninitialized: false,
    cookie:{ //cookie
        httponly: true,
        maxAge:60*60*1000, //set to 1 hour
        secure:false
        }}));  
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());
app.use(flash());
app.use(function(req, res, next) {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
  });
  app.get('/register',(req,res)=>{
    res.render('register');
  });
  app.get('/dashboard',(req,res)=>{
    res.send("Logged in");
  })

  app.post('/register',(req,res)=>{
    const { name,password,password2} = req.body;
    let errors=[];
    if(!name || !password || !password2){
       errors.push({msg: 'Input'});
    }
    if(password!==password2){
      errors.push({msg:'Not matching'});
    }
    if(password.length <5){ 
      errors.push({ msg: 'Password should have atleast 5 chars' });
    }
    if(errors.length >0){
      res.render('register',{errors,name,password,password2});
    }
     else {
      conn.query('SELECT name FROM user WHERE name ="' + name +'"', function (err, result) {
          if (err) throw err;
          console.log(result);    
          if(result.length == 0){ 
              bcrypt.genSalt(10, (err, salt) => { 
              bcrypt.hash(password,salt, function(err, hash) {
                  var sql = "INSERT INTO user (name,password) VALUES (?,?)";
                  var values = [name,hash]
                  conn.query(sql,values, function (err, result, fields) {
                  if (err) throw err;
                  req.flash('success_msg','You are now registered. Do login!');
                  res.redirect('/login');
                  });
               });
            });
          }
          else{
              req.flash('error','User name is already registered');
             // errors.push({ msg: 'Email is already registered' });
             res.render('register', {
              errors,
              name,
              password,
              password2 
            });               
          }
        });
          
       } 
      });
      app.get("/login",(req,res)=>{
        res.render('login');
      });

      app.get('/logout',
      function(req, res){
        var sql='SELECT name from user WHERE loggedin="y";';
        conn.query(sql,(err,data)=>{
          var name=data[0].name;
          if(err) throw err;
          else{
            var sqlu='UPDATE user set loggedin="n" where name="'+name+'"';
            conn.query(sqlu,(err,data)=>{
              if(err) throw err;
            });

          };
        });
        req.logout();
        res.redirect('/login');
      });
    
    app.post('/login', 
      passport.authenticate('local-login', { 
        successRedirect: '/dashboard',
        failureRedirect: '/login',
        failureFlash: true }),
      function(req, res) {
        res.redirect('/');
      });
    //Authentication using passport
    passport.use(
      "local-login",
      new Strategy(
        {
          usernameField: "name",
          passwordField: "password",
          passReqToCallback: true
        },
        function(req, name, password, done) {
          console.log(name);
          console.log(password);
          conn.query('UPDATE user SET loggedin="y" where name=+"'+name+'"',(err,data)=>{
            if(err) throw err;
            console.log(data);
          });
          conn.query('SELECT * FROM user WHERE name ="' + name +'"',function(err, rows) {
            console.log(rows);  
            if (err) return done(err);
              if (!rows.length) {
                return done(
                  null,
                  false,
                  {message: "User name is not registered"});
              }
              console.log(rows[0].password);
              bcrypt.compare(password,rows[0].password,function(err,result){
                if(result){
                  return done(null, rows[0]);
                }
                else{
                  return done(
                    null,
                    false,
                    { message: 'Incorrect user name or password' });
                }
              });
                
            });
        }
    )
    );
    //Serialize the user
    passport.serializeUser(function(user, done) {
      done(null, user.id);
    });
    
    // Deserialize the user
    passport.deserializeUser(function(id, done) {
      conn.query("select * from user where id = " + id, function(
        err,
        rows
      ) {
        done(err, rows[0]);
      });
    });

app.listen(process.env.PORT || 3000, function(err){
    if(err){
        console.log(err);
    }else{
        console.log("Server is listening..");
    }
});

