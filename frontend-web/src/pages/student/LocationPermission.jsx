// components/LocationPermission.jsx
import React, { useState, useEffect } from 'react';

const LocationPermission = ({ onLocationGranted, onLocationDenied, onClose }) => {
  const [permissionStatus, setPermissionStatus] = useState('prompt');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const requestLocation = () => {
    setIsLoading(true);
    setError('');
    
    if (!navigator.geolocation) {
      setPermissionStatus('denied');
      setError('المتصفح لا يدعم تحديد الموقع');
      onLocationDenied?.('المتصفح لا يدعم تحديد الموقع');
      setIsLoading(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPermissionStatus('granted');
        onLocationGranted?.({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setIsLoading(false);
        onClose?.();
      },
      (error) => {
        setPermissionStatus('denied');
        let errorMessage = '';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'يرجى السماح بالوصول إلى الموقع لتسجيل الغياب';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'معلومات الموقع غير متوفرة حالياً';
            break;
          case error.TIMEOUT:
            errorMessage = 'انتهى وقت محاولة الحصول على الموقع';
            break;
          default:
            errorMessage = 'حدث خطأ في الحصول على الموقع';
        }
        setError(errorMessage);
        onLocationDenied?.(errorMessage);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  if (permissionStatus === 'granted') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'white',
      padding: '20px',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      border: '1px solid #e2e8f0',
      maxWidth: '320px',
      zIndex: 1000,
      animation: 'slideIn 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <span style={{ fontSize: '28px' }}>📍</span>
        <div>
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>الموقع مطلوب</h4>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
            لتسجيل الغياب، نحتاج إلى معرفة موقعك الحالي
          </p>
        </div>
      </div>
      
      {error && (
        <div style={{
          background: '#fee2e2',
          color: '#991b1b',
          padding: '8px',
          borderRadius: '8px',
          fontSize: '12px',
          marginBottom: '12px'
        }}>
          {error}
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={requestLocation}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '10px 16px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '14px',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading ? 'جاري الحصول على الموقع...' : 'السماح بالوصول إلى الموقع'}
        </button>
        
        {onClose && (
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px',
              background: '#f1f5f9',
              color: '#475569',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px'
            }}
          >
            إغلاق
          </button>
        )}
      </div>
      
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default LocationPermission;