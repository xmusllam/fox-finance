import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// تحويل الأرقام العربية والفارسية إلى إنجليزية
const convertArabicToEnglish = (str) => {
  return str
    .replace(/[٠١٢٣٤٥٦٧٨٩]/g, (d) => d.charCodeAt(0) - 0x0660)
    .replace(/[۰۱۲۳۴۵۶۷۸۹]/g, (d) => d.charCodeAt(0) - 0x06F0);
};

// اعتراض الكتابة المباشرة قبل ما تدخل للـ DOM
document.addEventListener('beforeinput', (e) => {
  if (!e.target.matches('input, textarea')) return;
  if (!e.data) return;

  const converted = convertArabicToEnglish(e.data);
  if (converted !== e.data) {
    e.preventDefault();
    document.execCommand('insertText', false, converted);
  }
}, true);

// اعتراض اللصق (Paste)
document.addEventListener('paste', (e) => {
  if (!e.target.matches('input, textarea')) return;

  const text = e.clipboardData.getData('text');
  const converted = convertArabicToEnglish(text);
  if (converted !== text) {
    e.preventDefault();
    document.execCommand('insertText', false, converted);
  }
}, true);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
