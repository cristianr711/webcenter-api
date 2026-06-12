const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

(async () => {
    try {
        const form = new FormData();
        form.append('nombre', 'Test Product Multiple Images');
        form.append('precio_venta', '500');
        form.append('stock_actual', '10');
        form.append('id_categoria', '');
        form.append('descripcion', 'Test description');
        
        const buffer = Buffer.from('hello world', 'utf8');
        form.append('imagenes', buffer, { filename: 'test1.png', contentType: 'image/png' });
        form.append('imagenes', buffer, { filename: 'test2.png', contentType: 'image/png' });

        const response = await axios.post('https://webcenter-api.vercel.app/api/productos', form, {
            headers: form.getHeaders()
        });
        console.log(response.status, response.data);
    } catch (e) {
        if (e.response) {
            console.error('Error Response:', e.response.status, e.response.data);
        } else {
            console.error(e.message);
        }
    }
})();
