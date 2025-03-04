module.exports = {
    darkMode: 'class',
    content: ["./landingPage.html","./loggedIn.html","store.html","viewstore.html","./src/js.{js,jsx,ts,tsx,vue,html}", "./src/**/*.{js,ts,jsx,tsx}", "./resources/**/*.{js,ts,jsx,tsx}"],
    safelist:[
      'bg-black', 'bg-green-500',
    ],
    theme: {
      extend: {
        fontFamily: {
          poppins: ['Poppins', 'sans-serif'],
        },
        transitionProperty: {
          'height': 'height',
          'spacing': 'margin, padding',
          'opacity': 'opacity',
          'transform': 'transform',
        },
        transitionDuration: {
          '0': '0ms',
          '300': '300ms',
          '2000': '2000ms',
        },
        transitionTimingFunction: {
          'ease-in-out': 'ease-in-out',
        },
      },
    },
    plugins: [],
  };
  