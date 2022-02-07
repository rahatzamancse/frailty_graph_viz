import React from 'react';
import ReactDOM from 'react-dom';
import {
	BrowserRouter,
	Routes,
	Route
  } from "react-router-dom"
import App from './App';
import EvidenceIndex from './EvidenceIndex';
import Overview from './Overview';
import NetworkViz from './NetworkViz';
import ScrollToTop from './components/ScrollToTop';
import config from "./config.json"

import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-bootstrap-range-slider/dist/react-bootstrap-range-slider.css';
import StructuredSearch from "./StructuredSearch";

  
// ========================================
const rootElement = document.getElementById('root');

const { apiUrl } = config
console.log(apiUrl)

ReactDOM.render(
	<BrowserRouter>
		<Routes>
			<Route path="/" element={<App />}>
				<Route index element={
					<>
						<Overview 
							apiUrl={ apiUrl }
							entityId="uniprot:P05231"
							entityName="IL-6" />
						
						<ScrollToTop />
					</>}
				/>
				<Route path="viz" element={
					<>
						<NetworkViz
							apiUrl={ apiUrl } />
						<ScrollToTop />
					</>} />
				<Route path="evidence-index" element={
					<>
						<EvidenceIndex apiUrl={ apiUrl } defaultResults={ 100 } />
						<ScrollToTop />
					</>
				} />
				<Route path="structured-search" element={
					<>
						<StructuredSearch apiUrl={ apiUrl } />
						<ScrollToTop />
					</>
				}/>
				<Route
					path="*"
					element={
						<main style={{ padding: "1rem" }}>
						<p>There's nothing here!</p>
						</main>
					}
				/>
			</Route>
		</Routes>
	</BrowserRouter>,
	rootElement
);
  