import React, { useState, useRef, useEffect } from 'react';
import PageLayout from '../../components/student/PageLayout';
import { auth, db } from '../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const ProfilePage = () => {
  const [profile, setProfile] = useState({
    name: "Not Available",
    email: "Not Available",
    phone: "",
    department: "Not Available",
    level: "Not Available",
    studentId: "Not Available",
  });

  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchProfile(currentUser.uid);
      } else {
        console.log("No user logged in");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchProfile = async (uid) => {
    try {
      setLoading(true);

      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("Profile data:", data); 
 
        setProfile({
          name: data.fullName || data.name || "Not Available",
          email: data.email || auth.currentUser?.email || "Not Available",
          phone: data.phone || "",
          department: data.department || "Not Available",
          level: data.academicYear || data.level ? `level ${data.academicYear || data.level}` : "Not Available",
          studentId: data.code || data.studentId || "Not Available",
        });
        
        if (data.profileImage) {
          setProfileImage(data.profileImage);
          setImagePreview(data.profileImage);
        }
      } else {
        console.log("No document found for this user");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      alert("You must be logged in");
      return;
    }

    try {
      setLoading(true);
      // ✅ استخدمي نفس collection "users"
      const docRef = doc(db, "users", user.uid);
      await updateDoc(docRef, {
        phone: profile.phone,
        profileImage: profileImage || null,
        updatedAt: new Date().toISOString()
      });
      alert("Profile updated successfully ✅");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (user) {
      await fetchProfile(user.uid);
      alert("Changes cancelled");
    }
  };

  const handleChangePhoto = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      alert('Please select an image file (jpg, png, etc.)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Image size should be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setProfileImage(base64String);
      setImagePreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setProfileImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <PageLayout title="Profile" subtitle="View and manage your personal information">
        <div style={{ 
          textAlign: 'center', 
          padding: '50px',
          background: 'white',
          borderRadius: '20px',
          marginTop: '24px'
        }}>
          <div style={{ fontSize: '18px', color: '#64748b' }}>Loading profile...</div>
        </div>
      </PageLayout>
    );
  }

  if (!user) {
    return (
      <PageLayout title="Profile" subtitle="View and manage your personal information">
        <div style={{ 
          textAlign: 'center', 
          padding: '50px',
          background: 'white',
          borderRadius: '20px',
          marginTop: '24px'
        }}>
          <div style={{ fontSize: '18px', color: '#64748b' }}>Please log in to view your profile</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Profile" subtitle="View and manage your personal information">
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '32px', marginTop: '24px' }}>
        {/* Sidebar */}
        <div style={{ background: 'white', borderRadius: '20px', padding: '32px 24px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />
          
          <div 
            style={{ 
              width: '150px', 
              height: '150px', 
              margin: '0 auto 24px', 
              position: 'relative', 
              cursor: 'pointer' 
            }} 
            onClick={handleChangePhoto}
          >
            {imagePreview ? (
              <img 
                src={imagePreview} 
                alt="Profile" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  borderRadius: '50%', 
                  objectFit: 'cover', 
                  border: '4px solid white', 
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                }} 
              />
            ) : (
              <div style={{ 
                width: '100%', 
                height: '100%', 
                borderRadius: '50%', 
                background: '#f1f5f9', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '64px', 
                border: '4px solid white', 
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
              }}>
                {profile.name?.split(" ").map(n => n[0]).join("") || "👤"}
              </div>
            )}
            <div style={{ 
              position: 'absolute', 
              bottom: '5px', 
              right: '5px', 
              background: '#2563eb', 
              color: 'white', 
              width: '36px', 
              height: '36px', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '18px', 
              border: '3px solid white', 
              cursor: 'pointer' 
            }}>
              ✏️
            </div>
          </div>

          <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a', marginBottom: '8px' }}>
            {profile.name}
          </h3>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>
            {profile.studentId}
          </p>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button 
              onClick={handleChangePhoto} 
              style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', cursor: 'pointer' }}
            >
              Upload Photo
            </button>
            {imagePreview && (
              <button 
                onClick={handleRemovePhoto} 
                style={{ padding: '10px 20px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '12px', fontSize: '14px', cursor: 'pointer' }}
              >
                Remove
              </button>
            )}
          </div>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '16px' }}>
            Supported: JPG, PNG, GIF (Max 2MB)
          </p>
        </div>

        {/* Form */}
        <div style={{ background: 'white', borderRadius: '20px', padding: '32px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#0f172a', 
            marginBottom: '24px', 
            paddingBottom: '16px', 
            borderBottom: '2px solid #f1f5f9' 
          }}>
            Basic Information
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '32px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#475569', marginBottom: '8px' }}>Full Name</label>
              <input 
                type="text" 
                value={profile.name} 
                disabled 
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '15px', background: '#f8fafc', color: '#64748b' }} 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#475569', marginBottom: '8px' }}>Email</label>
              <input 
                type="email" 
                value={profile.email} 
                disabled 
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '15px', background: '#f8fafc', color: '#64748b' }} 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#475569', marginBottom: '8px' }}>Phone Number</label>
              <input 
                type="tel" 
                value={profile.phone} 
                onChange={(e) => setProfile({...profile, phone: e.target.value})} 
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '15px' }}
                placeholder="Enter your phone number"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#475569', marginBottom: '8px' }}>Department</label>
              <input 
                type="text" 
                value={profile.department} 
                disabled 
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '15px', background: '#f8fafc', color: '#64748b' }} 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#475569', marginBottom: '8px' }}>Level</label>
              <input 
                type="text" 
                value={profile.level} 
                disabled 
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '15px', background: '#f8fafc', color: '#64748b' }} 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#475569', marginBottom: '8px' }}>Student ID</label>
              <input 
                type="text" 
                value={profile.studentId} 
                disabled 
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '15px', background: '#f8fafc', color: '#64748b' }} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', paddingTop: '24px', borderTop: '2px solid #f1f5f9' }}>
            <button 
              onClick={handleSave} 
              style={{ padding: '12px 32px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '500', cursor: 'pointer' }}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button 
              onClick={handleCancel} 
              style={{ padding: '12px 32px', background: 'white', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: '500', cursor: 'pointer' }}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default ProfilePage;