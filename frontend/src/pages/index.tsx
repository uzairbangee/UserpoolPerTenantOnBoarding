import React from "react"
import {Link} from "gatsby";

export default function Home() {
    return (
      <div>
         <div>HOME</div>
          <Link to="/app">
            <h3>App</h3>
          </Link>
      </div>
    )
}