var express = require('express');
var router = express.Router();


router.all('/*', function (req,res,next) {
    res.app.locals.layout = 'admin';
    next();
})

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('admin/supplier', { title: 'Supplier' });
});


module.exports = router;






































































































// const express = require('express');
// const router = express.Router();
// const Supplier = require('../models/Supplier');
//
// // 1. Hiển thị danh sách Nhà cung cấp (Trang giao diện bạn vừa làm)
// router.get('/', async (req, res) => {
//     try {
//         // Lấy tất cả dữ liệu từ DB. Dùng .lean() để Handlebars có thể đọc được dữ liệu
//         const suppliers = await Supplier.find().sort({ createdAt: -1 }).lean();
//
//         res.render('admin/supplier/index', {
//             layout: 'admin',   // Sử dụng khung layout của Admin
//             suppliers: suppliers // Truyền dữ liệu ra file hbs
//         });
//     } catch (error) {
//         console.log(error);
//         res.status(500).send('Đã có lỗi xảy ra khi tải danh sách!');
//     }
// });
//
// // 2. Hiển thị Form thêm Nhà cung cấp mới (Giao diện create.hbs)
// router.get('/create', (req, res) => {
//     res.render('admin/supplier/create', { layout: 'admin' });
// });
//
// // 3. Xử lý khi Admin điền form và bấm nút "Thêm"
// router.post('/create', async (req, res) => {
//     try {
//         const { name, phone, email, address, status } = req.body;
//
//         // Tạo một bản ghi mới
//         const newSupplier = new Supplier({
//             name: name,
//             phone: phone,
//             email: email,
//             address: address,
//             status: status
//         });
//
//         await newSupplier.save(); // Lưu vào DB
//         res.redirect('/admin/supplier'); // Lưu thành công thì tự động quay về trang danh sách
//     } catch (error) {
//         console.log(error);
//         res.redirect('back'); // Nếu lỗi thì ở lại trang cũ
//     }
// });
//
// // 4. Xóa Nhà cung cấp
// router.get('/delete/:id', async (req, res) => {
//     try {
//         await Supplier.findByIdAndDelete(req.params.id); // Tìm ID và xóa
//         res.redirect('/admin/supplier'); // Xóa xong load lại trang danh sách
//     } catch (error) {
//         console.log(error);
//         res.redirect('back');
//     }
// });
//
// module.exports = router;
