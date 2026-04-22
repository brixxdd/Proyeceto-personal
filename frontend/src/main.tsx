import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ApolloProvider } from '@apollo/client/react'
import { apolloClient } from './lib/apollo'
import { ThemeProvider } from './context/ThemeContext'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <ApolloProvider client={apolloClient}>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </ApolloProvider>
)
