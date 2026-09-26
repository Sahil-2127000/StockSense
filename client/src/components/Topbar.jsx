import Icon from "../icons/Icon";

export default function Topbar({
  warehouse = "Main Warehouse",
  notificationCount = 3,
  user = { name: "Purvika Jain", role: "Inventory Manager", initials: "PJ" },
  onNewOperation,
}) {
  return (
    <div className="top">
      <div className="search">
        <Icon name="search" />
        <span className="ph-txt">Search products or references</span>
        <kbd>⌘K</kbd>
      </div>
      <span className="whsel">
        <span className="tag">WH</span>
        {warehouse}
        <Icon name="chev" />
      </span>
      <div className="sp" />
      <span className="btn pri" onClick={onNewOperation}>
        <Icon name="plus" />New operation<Icon name="chev" />
      </span>
      <span className="bell">
        <Icon name="bell" />
        {notificationCount > 0 && <em>{notificationCount}</em>}
      </span>
      <div className="who">
        <span className="av">{user.initials}</span>
        <div>
          <b>{user.name}</b>
          <small>{user.role}</small>
        </div>
      </div>
    </div>
  );
}
