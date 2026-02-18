import React from "react";

export default function Page({ title, sub, children }) {
  return (
    <div className="container">
      {title && <h1 className="pageTitle">{title}</h1>}
      {sub && <p className="pageSub">{sub}</p>}
      {children}
    </div>
  );
}
