document.addEventListener("DOMContentLoaded", function() {
    const products = window.productsData || [];
    let itemCount = 0;

    function addItemRow(initialData = null) {
        const index = itemCount++;
        
        const rowHtml = `
            <tr id="item-row-${index}">
                <td>
                    <select name="items[${index}][product]" class="form-control product-select" required style="width: 100%;">
                        <option value="" disabled selected>-- Select Product --</option>
                        ${products.map(p => `<option value="${p._idStr}">${p.name}</option>`).join('')}
                    </select>
                </td>
                <td>
                    <select name="items[${index}][size]" class="form-control custom-select size-select" required disabled>
                        <option value="" disabled selected>-- Size --</option>
                    </select>
                </td>
                <td>
                    <input type="text" class="form-control stock-display bg-light" readonly value="0">
                </td>
                <td>
                    <input type="number" name="items[${index}][quantityRequested]" class="form-control" min="1" required placeholder="Qty">
                </td>
                <td class="text-center align-middle">
                    <button type="button" class="btn btn-sm btn-danger remove-item-btn" data-index="${index}">
                        &times;
                    </button>
                </td>
            </tr>
        `;

        jQuery('#items-tbody').append(rowHtml);

        // Initialize Select2 on the new product selector if library exists
        const $newSelect = jQuery(`#item-row-${index} .product-select`);
        if (jQuery.fn.select2) {
            $newSelect.select2({
                placeholder: "-- Select Product --",
                allowClear: false
            });
        }

        // Bind change listener for product select
        $newSelect.on('change', function() {
            const productId = jQuery(this).val();
            const $sizeSelect = jQuery(`#item-row-${index} .size-select`);
            const $stockInput = jQuery(`#item-row-${index} .stock-display`);

            $sizeSelect.html('<option value="" disabled selected>-- Size --</option>');
            $sizeSelect.prop('disabled', true);
            $stockInput.val('0');

            const product = products.find(p => p._idStr === productId);
            if (product && product.variants && product.variants.length > 0) {
                product.variants.forEach(v => {
                    $sizeSelect.append(`<option value="${v.size}">${v.size}</option>`);
                });
                $sizeSelect.prop('disabled', false);
            }
        });

        // Bind change listener for size select
        const $sizeSelect = jQuery(`#item-row-${index} .size-select`);
        $sizeSelect.on('change', function() {
            const productId = $newSelect.val();
            const selectedSize = jQuery(this).val();
            const $stockInput = jQuery(`#item-row-${index} .stock-display`);

            const product = products.find(p => p._idStr === productId);
            if (product && product.variants) {
                const variant = product.variants.find(v => v.size === selectedSize);
                $stockInput.val(variant ? variant.quantity : '0');
            } else {
                $stockInput.val('0');
            }
        });

        // Populate initial data if provided
        if (initialData) {
            $newSelect.val(initialData.product).trigger('change');
            $sizeSelect.val(initialData.size).trigger('change');
            jQuery(`#item-row-${index} input[name="items[${index}][quantityRequested]"]`).val(initialData.quantityRequested);
        }
    }

    // Add initial rows
    if (window.selectedProductsData && window.selectedProductsData.length > 0) {
        window.selectedProductsData.forEach(product => {
            const variants = product.variants || [];
            const defaultVariant = variants.length > 0
                ? variants.reduce((lowest, variant) =>
                    variant.quantity < lowest.quantity ? variant : lowest
                )
                : null;

            addItemRow({
                product: product._idStr,
                size: defaultVariant ? defaultVariant.size : '',
                quantityRequested: defaultVariant && defaultVariant.quantity <= product.lowStockThreshold ? 20 : 1
            });
        });
    } else if (window.preExistingItems && window.preExistingItems.length > 0) {
        window.preExistingItems.forEach(item => {
            addItemRow(item);
        });
    } else {
        addItemRow();
    }

    // Handle Add Button Click
    jQuery('#add-item-btn').on('click', function() {
        addItemRow();
    });

    // Handle Remove Button Click
    jQuery('#items-tbody').on('click', '.remove-item-btn', function() {
        const index = jQuery(this).data('index');
        jQuery(`#item-row-${index}`).remove();
    });

    // Prevent submission if item list is empty
    jQuery('#create-request-form').on('submit', function(e) {
        if (jQuery('#items-tbody tr').length === 0) {
            e.preventDefault();
            alert('Please add at least one product item to the request.');
        }
    });
});
