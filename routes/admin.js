var express = require('express');

var router = express.Router();
var productHelpers=require('../helpers/product-helpers');
const { Long } = require('mongodb');

const verifyLogin=(req,res,next)=>{
  if(req.session.adminLoggedIn){
    next()
  }else{
    res.redirect('/adminlogin')
  }
}

/* GET users listing. */
router.get('/', function(req, res, next) {
    let admi=req.session.admin
    
   productHelpers.getAllProducts().then((products)=>{
 
    res.render('admin/view-products',{admin:true,products,admi})
   })
    
});
router.get('/adminlogin', (req, res) => {
  if(req.session.admin){
    res.redirect('/admin')
  }else{
  res.render('admin/adminlogin',{"loginErr":req.session.adminLoginErr,admin:true})
  req.session.adminLoginErr=false;
  }
})
router.post('/adminlogin', (req, res) => {
  productHelpers.doLogin(req.body).then((response) => {
    if(response.status){
      
      req.session.admin=response.admin
      req.session.adminLoggedIn=true
      res.redirect('/admin')
    }else{
      req.session.adminLoginErr="Invalid User name and Password";
      res.redirect('/admin/adminlogin')
    }
  })

})

router.get('/logout',(req,res)=>{
  req.session.admin=null
  req.session.adminLoggedIn=false
  res.redirect('/admin')
})
router.get('/add-product',verifyLogin,function(req,res){
  res.render('admin/add-product')

});
router.post('/add-product',function(req,res){


  
 

  productHelpers.addProduct(req.body,(id)=>{
    let image=req.files.Image
  
    image.mv('public/product-images/'+id+'.jpg',(err)=>{
      if(!err){
     res.render("admin/add-product")
      }else{
        console.log(err);
      }
    })
   
  })
})
router.get('/delete-product/:id',verifyLogin,(req,res)=>{
  let proId=req.params.id
  console.log(proId);
  productHelpers.deleteProduct(proId).then((response)=>{
    res.redirect('/admin')
  })
  
   
 

})
router.get('/edit-product/:id',verifyLogin,async(req,res)=>{

  let product=await productHelpers.getProductDetails(req.params.id)
   
    res.render('admin/edit-product',{product})
    
  })
  
  router.post('/edit-product/:id',(req,res)=>{
      productHelpers.updateProduct(req.params.id,req.body).then(()=>{
        res.redirect('/admin')
        if(req.files.Image){
          let image=req.files.Image
          let id=req.params.id
          image.mv('public/product-images/'+id+'.jpg')
          

        }
      })
      })
     
  
  
 



module.exports = router;
