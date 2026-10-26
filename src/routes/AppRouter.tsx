import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from '../components/Layout'
import HomeView from '../views/HomeView'
import CompetenciaView from '../views/CompetenciaView'
import SumaEnterosView from '../views/SumaEnterosView'
import RestaEnterosView from '../views/RestaEnterosView'
import ProductoEnteroView from '../views/ProductoEnteroView'
import DivisionEnterosView from '../views/DivisionEnterosView'
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
import BalanzaEcuacion2View from '../views/BalanzaEcuacion2View'
import AlgeblocksEcuacionView from '../views/AlgeblocksEcuacionView'
import MaquinaEcuacionView from '../views/MaquinaEcuacionView'
import BarrasEcuacionView from '../views/BarrasEcuacionView'
import PuenteEcuacionView from '../views/PuenteEcuacionView'
import GeoplanoView from '../views/GeoplanoView'
import AngulosView from '../views/AngulosView'
import MedirAngulosView from '../views/MedirAngulosView'
import ExistenciaTrianguloView from '../views/ExistenciaTrianguloView'

const router = createBrowserRouter([
    {
        path: '/',
        element: <Layout><HomeView /></Layout>
    },
    {
        path: '/competencia/:competencyId',
        element: <Layout><CompetenciaView /></Layout>
    },
    {
        path: '/intro-enteros',
        element: <IntroEnterosView />
    },
    {
        path: '/recta-numerica',
        element: <Layout><RectaNumericaView /></Layout>
    },
    {
        path: '/suma-enteros',
        element: <SumaEnterosView />
    },
    {
        path: '/resta-enteros',
        element: <RestaEnterosView />
    },
    {
        path: '/producto-enteros',
        element: <ProductoEnteroView />
    },
    {
        path: '/division-enteros',
        element: <DivisionEnterosView />
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
        element: <SumaRestaFraccionesView />
    },
    {
        path: '/recta-numerica-fracciones',
        element: <RectaNumericaFraccionesView />
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
        element: <ConceptoFraccionView />
    },
    {
        path: '/fraccion-conjunto',
        element: <Layout><FraccionConjuntoView /></Layout>
    },
    {
        path: '/igualdad-balanza',
        element: <IgualdadBalanzaView />
    },
    {
        path: '/balanza-ecuacion',
        element: <AlgeblocksEcuacionView />
    },
    {
        path: '/algeblocks-ecuacion',
        element: <AlgeblocksEcuacionView />
    },
    {
        path: '/maquina-ecuacion',
        element: <MaquinaEcuacionView />
    },
    {
        path: '/barras-ecuacion',
        element: <BarrasEcuacionView />
    },
    {
        path: '/puente-ecuacion',
        element: <PuenteEcuacionView />
    },
    {
        path: '/balanza-ecuacion-2',
        element: <BalanzaEcuacion2View />
    },
    {
        path: '/geoplano',
        element: <GeoplanoView />
    },
    {
        path: '/angulos',
        element: <AngulosView />
    },
    {
        path: '/medir-angulos',
        element: <MedirAngulosView />
    },
    {
        path: '/existencia-triangulo',
        element: <ExistenciaTrianguloView />
    }
])

export default function AppRouter() {
    return <RouterProvider router={router} />
}