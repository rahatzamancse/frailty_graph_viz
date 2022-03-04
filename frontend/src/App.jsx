import React from "react-dom"
import { NavLink, Outlet } from "react-router-dom"
import "./App.css"

function  isActiveNavLink({  isActive }) {
  return {
    textDecoration: isActive?"underline":"none",
    fontWeight: isActive?"bold":"normal"
  }
}

export default function App() {
  return (
	<div>
    <div className="header">
      <h1>Explore Frailty Literature</h1>
      <nav>
          <NavLink to="/" style={isActiveNavLink}>Interactions Overview</NavLink> |{" "}
          <NavLink to="/blob-viz" style={isActiveNavLink}>Graphic OverView</NavLink> | {" "}
          {/* <NavLink to="/viz" style={isActiveNavLink}>Network View</NavLink> | {" "} */}
          <NavLink to="/evidence-index" style={isActiveNavLink}>Search Evidence</NavLink> | {" "}
          <NavLink to="/structured-search" style={isActiveNavLink}>Structured Evidence Search</NavLink>

        </nav>
    </div>
	  <br />
    <div className="content">
      <Outlet />
    </div>
	</div>
  )
}