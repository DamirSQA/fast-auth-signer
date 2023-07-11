import * as React from 'react';
import { Link, Outlet } from 'react-router-dom';

function Layout() {
  return (
    <div>
      <div>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/login">Login</Link>
          </li>
          <li>
            <Link to="/sign">Sign</Link>
          </li>
        </ul>
      </div>
      <div>
        <Outlet />
      </div>
    </div>
  );
}

export default Layout;
