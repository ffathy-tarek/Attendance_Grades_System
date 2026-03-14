
import React from 'react';
import styles from './PageLayout.module.css';

const PageLayout = ({ title, subtitle, children, actions }) => {
  return (
    <div className={styles.page}>
     
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
       
        {actions && (
          <div className={styles.actions}>
            {actions}
          </div>
        )}
      </div>

     
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
};

export default PageLayout;