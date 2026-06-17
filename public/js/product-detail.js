/* public/js/product-detail.js */

document.addEventListener('DOMContentLoaded', function() {
    const sizeLabels = document.querySelectorAll('.size-label:not(.disabled)');
    const qtyInput = document.querySelector('input[name="qty"]');

    sizeLabels.forEach(label => {
        const radioInput = label.querySelector('input[type="radio"]');

        // Lấy số lượng tồn kho từ attribute data-stock
        const maxStock = parseInt(label.getAttribute('data-stock')) || 1;

        label.addEventListener('click', function() {
            // 1. Cập nhật thuộc tính max cho ô số lượng dựa theo size vừa chọn
            if (qtyInput) {
                qtyInput.setAttribute('max', maxStock);

                // Nếu số lượng khách đang nhập lỡ lớn hơn kho của size mới chọn, tự động kéo về max
                if (parseInt(qtyInput.value) > maxStock) {
                    qtyInput.value = maxStock;
                }
            }
        });
    });

    // 2. Validate trước khi Submit Form đặt hàng
    const orderForm = document.querySelector('form[action^="/add-cart/"]');
    if (orderForm) {
        orderForm.addEventListener('submit', function(e) {
            const selectedSize = orderForm.querySelector('input[name="size"]:checked');

            // Nếu sản phẩm có variants nhưng khách chưa chọn size nào
            if (sizeLabels.length > 0 && !selectedSize) {
                e.preventDefault(); // Chặn gửi form lên server
                alert('Vui lòng chọn Size trang sức bạn muốn mua nhé! 💎');
            }
        });
    }
});