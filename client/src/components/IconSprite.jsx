import React from 'react';

// Mount this ONCE, at the root of the app (in App.jsx), not per-page.
// <Icon name="..."/> then works anywhere via <use href="#name"/>.
export default function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <symbol id="home" viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></symbol>
      <symbol id="box" viewBox="0 0 24 24"><path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></symbol>
      <symbol id="layers" viewBox="0 0 24 24"><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/></symbol>
      <symbol id="down" viewBox="0 0 24 24"><path d="M12 4v14M6 12l6 6 6-6"/></symbol>
      <symbol id="up" viewBox="0 0 24 24"><path d="M12 20V6M6 12l6-6 6 6"/></symbol>
      <symbol id="swap" viewBox="0 0 24 24"><path d="M4 8h14l-4-4M20 16H6l4 4"/></symbol>
      <symbol id="sliders" viewBox="0 0 24 24"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></symbol>
      <symbol id="clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></symbol>
      <symbol id="wh" viewBox="0 0 24 24"><path d="M3 21V9l9-5 9 5v12"/><path d="M7 21v-8h10v8M7 17h10"/></symbol>
      <symbol id="pin" viewBox="0 0 24 24"><path d="M12 21s7-6.1 7-12a7 7 0 0 0-14 0c0 5.9 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></symbol>
      <symbol id="gear" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></symbol>
      <symbol id="search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></symbol>
      <symbol id="bell" viewBox="0 0 24 24"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.7 21a2 2 0 0 1-3.4 0"/></symbol>
      <symbol id="plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
      <symbol id="list" viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></symbol>
      <symbol id="kanban" viewBox="0 0 24 24"><rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="10" rx="1.5"/><rect x="17" y="4" width="4" height="13" rx="1.5"/></symbol>
      <symbol id="user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></symbol>
      <symbol id="logout" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></symbol>
      <symbol id="check" viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></symbol>
      <symbol id="x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol>
      <symbol id="alert" viewBox="0 0 24 24"><path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17.5v.01"/></symbol>
      <symbol id="printer" viewBox="0 0 24 24"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7"/></symbol>
      <symbol id="chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></symbol>
      <symbol id="right" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></symbol>
      <symbol id="cal" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></symbol>
      <symbol id="mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></symbol>
      <symbol id="lock" viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></symbol>
      <symbol id="eye" viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></symbol>
      <symbol id="edit" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></symbol>
      <symbol id="trash" viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></symbol>
      <symbol id="filter" viewBox="0 0 24 24"><path d="M3 5h18l-7 8v6l-4 2v-8z"/></symbol>
      <symbol id="more" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></symbol>
      <symbol id="cube" viewBox="0 0 32 32"><path d="M16 3l11 6v14l-11 6-11-6V9z" fill="#2F5BEA" stroke="none"/><path d="M16 3l11 6-11 6-11-6z" fill="#7C9BFF" stroke="none"/><path d="M16 15v14l-11-6V9z" fill="#1E46C7" stroke="none"/></symbol>
    </svg>
  );
}