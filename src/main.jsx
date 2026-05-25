import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// تحويل الأرقام العربية والفارسية إلى إنجليزية في جميع حقول الإدخال
const convertArabicToEnglish = (str) => {
  return str
    .replace(/[٠١٢٣٤٥٦٧٨٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰۱۲۳۴۵۶۷۸۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
};

document.addEventListener('input', (e) => {
  const target = e.target;
  if (target.matches('input, textarea')) {
    const converted = convertArabicToEnglish(target.value);
    if (converted !== target.value) {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      ).set;
      nativeSetter.call(target, converted);
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}, true);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
