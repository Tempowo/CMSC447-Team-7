import React, {useState} from 'react';
import './App.css'

const LogoButton = () => {
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    setClicked(!clicked);
  }

  return (
    <button className={clicked ? 'clicked' : ''} onClick={handleClick}>
      {clicked ? 'Clicked!' : 'Click me!'}
    </button>
  );
}

export default LogoButton;