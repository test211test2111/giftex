module.exports = {
  content: ["./views/**/*.ejs", "./public/**/*.js"],
  theme: {
    extend: {
      colors: {
        telegram: {
          blue: '#0088cc',
          lightblue: '#b1d7f6',
          white: '#ffffff',
          gray: '#f4f4f5',
          darkgray: '#8e9396'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'system-ui', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
} 