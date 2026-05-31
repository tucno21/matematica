import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from '../components/Layout'
import HomeView from '../views/HomeView'
import SumaEnterosView from '../views/SumaEnterosView'
import FraccionesView from '../views/FraccionesView'
import DecimalesView from '../views/DecimalesView'
import PorcentajesView from '../views/PorcentajesView'
import RestaEnterosView from '../views/RestaEnterosView'
import ProductoEnteroView from '../views/ProductoEnteroView'
import IntroEnterosView from '../views/IntroEnterosView'
import RectaNumericaView from '../views/RectaNumericaView'
import TresJarrasView from '../views/TresJarrasView'
import TresPescadosView from '../views/TresPescadosView'
import GranjeroRioView from '../views/GranjeroRioView'
import MonedaFalsaView from '../views/MonedaFalsaView'
import RegletaFracionesView from '../views/RegletaFracionesView'
import SumaRestaFraccionesView from '../views/SumaRestaFraccionesView'
import RectaNumericaFraccionesView from '../views/RectaNumericaFraccionesView'
import MultiplicarFraccionesView from '../views/MultiplicarFraccionesView'
import DivisionFraccionesView from '../views/DivisionFraccionesView'
import ConceptoFraccionView from '../views/ConceptoFraccionView'
import FraccionConjuntoView from '../views/FraccionConjuntoView'
import IgualdadBalanzaView from '../views/IgualdadBalanzaView'

const router = createBrowserRouter([
    {
        path: '/',
        element: <Layout><HomeView /></Layout>
    },
    {
        path: '/intro-enteros',
        element: <Layout><IntroEnterosView /></Layout>
    },
    {
        path: '/recta-numerica',
        element: <Layout><RectaNumericaView /></Layout>
    },
    {
        path: '/suma-enteros',
        element: <Layout><SumaEnterosView /></Layout>
    },
    {
        path: '/resta-enteros',
        element: <Layout><RestaEnterosView /></Layout>
    },
    {
        path: '/producto-enteros',
        element: <Layout><ProductoEnteroView /></Layout>
    },
    {
        path: '/tres-jarras',
        element: <Layout><TresJarrasView /></Layout>
    },
    {
        path: '/tres-pescados',
        element: <Layout><TresPescadosView /></Layout>
    },
    {
        path: '/granjero-rio',
        element: <Layout><GranjeroRioView /></Layout>
    },
    {
        path: '/moneda-falsa',
        element: <Layout><MonedaFalsaView /></Layout>
    },
    {
        path: '/regleta-fracciones',
        element: <RegletaFracionesView />
    },
    {
        path: '/suma-resta-fracciones',
        element: <Layout><SumaRestaFraccionesView /></Layout>
    },
    {
        path: '/recta-numerica-fracciones',
        element: <Layout><RectaNumericaFraccionesView /></Layout>
    },
    {
        path: '/multiplicar-fracciones',
        element: <Layout><MultiplicarFraccionesView /></Layout>
    },
    {
        path: '/division-fracciones',
        element: <Layout><DivisionFraccionesView /></Layout>
    },
    {
        path: '/concepto-fraccion',
        element: <Layout><ConceptoFraccionView /></Layout>
    },
    {
        path: '/fraccion-conjunto',
        element: <Layout><FraccionConjuntoView /></Layout>
    },
    {
        path: '/igualdad-balanza',
        element: <Layout><IgualdadBalanzaView /></Layout>
    },
    {
        path: '/fracciones',
        element: <Layout><FraccionesView /></Layout>
    },
    {
        path: '/decimales',
        element: <Layout><DecimalesView /></Layout>
    },
    {
        path: '/porcentajes',
        element: <Layout><PorcentajesView /></Layout>
    }
])

export default function AppRouter() {
    return <RouterProvider router={router} />
}