import React, { useState, useEffect, useRef } from 'react';
import PageLayout from '../../components/student/PageLayout';
import styles from '../../components/student/PageLayout.module.css';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const InstructorProfile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    department: '',
    phone: '',
    office: '',
    title: '',
    joinDate: '',
    subjectsCount: 0,
    studentsCount: 0,
    lecturesCount: 0,
    avgAttendance: 0
  });
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [originalProfileImage, setOriginalProfileImage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadProfileData = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // ========== 1. جلب بيانات المستخدم ==========
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        
        // ========== 2. جلب المواد من courses (نفس Dashboard) ==========
        const coursesQuery = query(
          collection(db, 'courses'),
          where('instructorIds', 'array-contains', user.uid)
        );
        const coursesSnap = await getDocs(coursesQuery);
        const subjectsCount = coursesSnap.size;
        
        // ========== 3. جلب عدد الطلاب من enrollments (نفس Dashboard) ==========
        let totalStudents = 0;
        for (const course of coursesSnap.docs) {
          const enrollmentsQuery = query(
            collection(db, 'enrollments'),
            where('courseId', '==', course.id)
          );
          const enrollmentsSnap = await getDocs(enrollmentsQuery);
          totalStudents += enrollmentsSnap.size;
        }
        
        // ========== 4. جلب عدد المحاضرات من lecture_sessions (نفس Dashboard) ==========
        const lecturesQuery = query(
          collection(db, 'lecture_sessions'),
          where('instructorId', '==', user.uid)
        );
        const lecturesSnap = await getDocs(lecturesQuery);
        const lecturesCount = lecturesSnap.size;
        
        // ========== 5. جلب متوسط الحضور من attendance (نفس Dashboard) ==========
        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('instructorId', '==', user.uid)
        );
        const attendanceSnap = await getDocs(attendanceQuery);
        
        let avgAttendance = 0;
        if (attendanceSnap.size > 0) {
          let totalAttendees = 0;
          attendanceSnap.forEach(doc => {
            const data = doc.data();
            const attendeesCount = data.attendees?.length || 0;
            totalAttendees += attendeesCount;
          });
          avgAttendance = (totalAttendees / (attendanceSnap.size * 10)).toFixed(1);
        }
        
        setProfile({
          fullName: userData?.fullName || userData?.name || user?.displayName || '',
          email: user?.email || '',
          department: userData?.department || 'Computer Science',
          phone: userData?.phone || '',
          office: userData?.office || '',
          title: userData?.title || 'Instructor',
          joinDate: userData?.joinDate || userData?.createdAt?.toDate?.()?.getFullYear() || '2024',
          subjectsCount: subjectsCount,
          studentsCount: totalStudents,
          lecturesCount: lecturesCount,
          avgAttendance: avgAttendance
        });

        if (userData?.profileImage) {
          setProfileImage(userData.profileImage);
          setOriginalProfileImage(userData.profileImage);
          setImagePreview(userData.profileImage);
        }
        
      } catch (error) {
        console.error('Error loading profile:', error);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [user?.uid]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        phone: profile.phone,
        department: profile.department,
        profileImage: profileImage || null,
        updatedAt: new Date()
      });
      
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.match('image.*')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size should be less than 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImage(reader.result);
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setProfileImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <PageLayout title="Profile" subtitle="Manage your personal information">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div style={{ fontSize: '18px', color: '#64748b' }}>Loading ...</div>
        </div>
      </PageLayout>
    );
  }

  const stats = [
    { label: 'Subjects', value: profile.subjectsCount, icon: '📚', color: '#3b82f6' },
    { label: 'Students', value: profile.studentsCount, icon: '👥', color: '#10b981' },
    { label: 'Lectures', value: profile.lecturesCount, icon: '📝', color: '#f59e0b' },
    { label: 'Avg Attendance', value: `${profile.avgAttendance}%`, icon: '📊', color: '#8b5cf6' }
  ];

  return (
    <PageLayout 
      title="Profile" 
      subtitle="Manage your personal information"
      actions={
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 24px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? 'Saving...' : '💾 Save Changes'}
          </button>
        </div>
      }
    >
      {error && (
        <div style={{ 
          background: '#fee2e2', 
          color: '#991b1b', 
          padding: '12px 20px', 
          borderRadius: '12px', 
          marginBottom: '20px' 
        }}>
          {error}
        </div>
      )}
      
      {success && (
        <div style={{ 
          background: '#dcfce7', 
          color: '#166534', 
          padding: '12px 20px', 
          borderRadius: '12px', 
          marginBottom: '20px' 
        }}>
          {success}
        </div>
      )}

      {/* Statistics Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '20px', 
        marginBottom: '32px' 
      }}>
        {stats.map((stat, index) => (
          <div key={index} style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '16px', 
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              background: `${stat.color}20`, 
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>{stat.icon}</div>
            <div>
              <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '24px', fontWeight: '600', color: '#0f172a' }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Profile Form */}
      <div className={styles.tableWrapper}>
        <div style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>
            Personal Information
          </h3>

          {/* Profile Image Upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '28px', padding: '20px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div
              style={{ width: '90px', height: '90px', borderRadius: '50%', overflow: 'hidden', border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer', flexShrink: 0 }}
              onClick={() => fileInputRef.current.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                  {profile.fullName?.split(' ').map(n => n[0]).join('').slice(0,2) || '👤'}
                </div>
              )}
            </div>
            <div>
              <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>{profile.fullName}</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>{profile.title} • {profile.department}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => fileInputRef.current.click()}
                  style={{ padding: '6px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}
                >
                  📷 Upload Photo
                </button>
                {imagePreview && (
                  <button
                    onClick={handleRemovePhoto}
                    style={{ padding: '6px 16px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>JPG, PNG (max 2MB)</div>
            </div>
          </div>
          
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Full Name</label>
              <input 
                type="text" 
                className={`${styles.input} ${styles.inputDisabled}`}
                value={profile.fullName}
                disabled
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Email</label>
              <input 
                type="email" 
                className={`${styles.input} ${styles.inputDisabled}`}
                value={profile.email}
                disabled
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Department</label>
              <input 
                type="text" 
                className={styles.input}
                value={profile.department}
                onChange={(e) => handleChange('department', e.target.value)}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Title / Position</label>
              <input 
                type="text" 
                className={`${styles.input} ${styles.inputDisabled}`}
                value={profile.title}
                disabled
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Phone Number</label>
              <input 
                type="tel" 
                className={styles.input}
                value={profile.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+20 123 456 789"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Office / Room</label>
              <input 
                type="text" 
                className={`${styles.input} ${styles.inputDisabled}`}
                value={profile.office}
                disabled
              />
            </div>
          </div>

          <div style={{ 
            marginTop: '24px',
            padding: '16px',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '14px', color: '#64748b' }}>Member Since</span>
                <div style={{ fontSize: '16px', fontWeight: '500', color: '#0f172a' }}>{profile.joinDate}</div>
              </div>
              <div>
                <span style={{ fontSize: '14px', color: '#64748b' }}>Status</span>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: '500', 
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ 
                    width: '8px', 
                    height: '8px', 
                    background: '#10b981', 
                    borderRadius: '50%',
                    display: 'inline-block'
                  }}></span>
                  Active
                </div>
              </div>
              <div>
                <span style={{ fontSize: '14px', color: '#64748b' }}>Role</span>
                <div style={{ fontSize: '16px', fontWeight: '500', color: '#0f172a' }}>Instructor</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Footer */}
      <div style={{
        marginTop: '24px',
        padding: '16px 20px',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <span style={{ fontWeight: '600', color: '#0f172a' }}>👨‍🏫 Instructor Information:</span>
          <div style={{ display: 'flex', gap: '16px', color: '#475569', fontSize: '14px' }}>
            <span>📚 {profile.subjectsCount} Subjects</span>
            <span>👥 {profile.studentsCount} Students</span>
            <span>📝 {profile.lecturesCount} Lectures</span>
            <span>📊 {profile.avgAttendance}% Avg Attendance</span>
          </div>
        </div>
        <div style={{
          background: '#e0f2fe',
          padding: '6px 12px',
          borderRadius: '30px',
          fontSize: '13px',
          color: '#0369a1'
        }}>
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>
    </PageLayout>
  );
};

export default InstructorProfile;