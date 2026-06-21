// client-side logic for admin inventory import stock form
document.addEventListener('DOMContentLoaded', function() {
    const products = window.productsData || [];

    const productSelect = document.getElementById('productId');
    const sizeSelect = document.getElementById('sizeName');
    const newProductSection = document.getElementById('new-product-section');
    const newProductMetaSection = document.getElementById('new-product-meta-section');
    const newSizeSection = document.getElementById('new-size-section');
    const sizeSelectGroup = document.getElementById('size-select-group');
    const newSizeInput = document.getElementById('newSizeName');

    const productSelectHidden = document.getElementById('productSelect');
    const sizeSelectHidden = document.getElementById('sizeSelect');

    if (productSelect) {
        productSelect.addEventListener('change', function() {
            const val = this.value;
            
            // Reset sizes dropdown
            sizeSelect.innerHTML = '<option value="" disabled selected>-- Select Size --</option>';
            sizeSelect.required = false;

            if (val === '__new__') {
                // Option 1: Create a new product
                newProductSection.style.display = 'block';
                newProductMetaSection.style.display = 'block';
                toggleNewProductRequired(true);
                productSelectHidden.value = 'new';

                // Switch size selection to textbox only
                sizeSelectGroup.style.display = 'none';
                newSizeSection.style.display = 'block';
                newSizeInput.required = true;
                sizeSelectHidden.value = 'new';
            } else if (val) {
                // Option 2: Select existing product
                newProductSection.style.display = 'none';
                newProductMetaSection.style.display = 'none';
                toggleNewProductRequired(false);
                productSelectHidden.value = 'existing';

                sizeSelectGroup.style.display = 'block';
                newSizeSection.style.display = 'none';
                newSizeInput.required = false;
                sizeSelect.required = true;
                sizeSelectHidden.value = 'existing';

                // Find matching product variants
                const product = products.find(p => p._id === val);
                if (product && product.variants) {
                    product.variants.forEach(v => {
                        const opt = document.createElement('option');
                        opt.value = v.size;
                        opt.textContent = `Size ${v.size} (Current: ${v.quantity} items)`;
                        sizeSelect.appendChild(opt);
                    });
                }

                // Append option to create a new size variant
                const newSizeOpt = document.createElement('option');
                newSizeOpt.value = '__new__';
                newSizeOpt.className = 'text-success font-weight-bold';
                newSizeOpt.textContent = '+ Create New Size Variant';
                sizeSelect.appendChild(newSizeOpt);
            } else {
                newProductSection.style.display = 'none';
                newProductMetaSection.style.display = 'none';
                toggleNewProductRequired(false);
                productSelectHidden.value = 'existing';

                sizeSelectGroup.style.display = 'block';
                newSizeSection.style.display = 'none';
                newSizeInput.required = false;
                sizeSelectHidden.value = 'existing';
            }
        });
    }

    if (sizeSelect) {
        sizeSelect.addEventListener('change', function() {
            const val = this.value;
            if (val === '__new__') {
                newSizeSection.style.display = 'block';
                newSizeInput.required = true;
                sizeSelectHidden.value = 'new';
            } else {
                newSizeSection.style.display = 'none';
                newSizeInput.required = false;
                sizeSelectHidden.value = 'existing';
            }
        });
    }

    function toggleNewProductRequired(isRequired) {
        const ids = ['newProductName', 'newProductDescription', 'newProductPrice', 'newProductCategory', 'newProductSupplier'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.required = isRequired;
        });
    }

    // Support updating file name in standard custom file input
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('custom-file-input')) {
            const file = e.target.files[0];
            if (file) {
                const label = e.target.nextElementSibling;
                label.innerText = file.name;
            }
        }
    });
});
