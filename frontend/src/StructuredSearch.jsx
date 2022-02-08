import { Typeahead, Highlighter } from 'react-bootstrap-typeahead';
import {Row, Form, Col, Button, Accordion} from "react-bootstrap";
import {useState, Fragment, useEffect} from "react";
import EvidencePanel from "./components/EvidencePanel";
import {fetchEntities, fetchInteractionTypes, structuredSearch} from "./utils/api";

function EntityTypeahead({ items, onChange }){

  return <Typeahead
            id="basic-typeahead-single"
            labelKey={ (option) => `${option.label} ${option.id}`}
            onChange={onChange}
            options={items}
            placeholder="Choose an entity..."
            renderMenuItemChildren={
              (option, { text }, index) => {
                return <>
                  <Highlighter search={text}>
                    {option.label}
                  </Highlighter>
                  <div>
                    <small>
                      <Highlighter search={text}>
                        {`${option.id}`}
                      </Highlighter>
                        <br />
                        {option.type}
                    </small>
                  </div>
                </>
              }
            }
        />
}

export default function StructuredSearch({ apiUrl }){
    const [controllers, setControllers] = useState([])
    const [controlleds, setControlleds] = useState([])
    const [interactionTypes, setInteractionTypes] = useState([])
    const [exactMatches, setExactMatches] = useState([])
    const [softMatches, setSoftMatches] = useState([])
    const [chosenController, setChosenController]  = useState()
    const [chosenControlled, setChosenControlled]  = useState()
    const [chosenInteraction, setChosenInteraction]  = useState()



    // Fetch the data after rendering
    useEffect(async () => {
        const entities = await fetchEntities(apiUrl)
        const interactions = await fetchInteractionTypes(apiUrl)

        setControllers(entities)
        setControlleds(entities)
        setInteractionTypes(interactions)
    },  [])


    return (
        <>
            <Row>
              <Col>
                <Form.Group>
                  <Form.Label>Controller Entity</Form.Label>
                  <EntityTypeahead items={controllers} onChange={setChosenController} />
                </Form.Group>
              </Col>
              <Col>
              <Form.Group>
                <Form.Label>Interaction Type</Form.Label>
                <Typeahead
                  id="basic-typeahead-single"
                  labelKey="name"
                  onChange={setChosenInteraction}
                  options={interactionTypes}
                  placeholder="Choose an interaction..."
                  // selected={singleSelections}
                />
              </Form.Group>
              </Col>
              <Col>
              <Form.Group>
                <Form.Label>Controlled Entity</Form.Label>
                <EntityTypeahead items={controlleds} onChange={setChosenControlled} />
              </Form.Group>
              </Col>
              <Col>
                <Button
                    style={{
                        position:"relative",
                        top: "2em"
                    }}
                    onClick={ async () => {
                        const [_, e_matches] = await structuredSearch(apiUrl, chosenController[0].id, chosenControlled[0].id, chosenInteraction)
                        let [__, s_matches] = await structuredSearch(apiUrl, chosenController[0].id, chosenControlled[0].id)
                        // Filter out the soft matches not containes in the exact matches
                        const filter = new Set(e_matches.map((e) => e.markup))
                        s_matches = s_matches.filter((s) => !filter.has(s.markup))
                        setExactMatches(e_matches)
                        setSoftMatches(s_matches)
                    }}
                >Search</Button>
              </Col>
            </Row>
            <br />
            <Accordion defaultActiveKey="exact">
                <Accordion.Item eventKey="exact">
                    <Accordion.Header>Exact Matches ({exactMatches.length})</Accordion.Header>
                    <Accordion.Body>
                        <EvidencePanel
                            apiUrl={apiUrl}
                            items={exactMatches}
                        />
                    </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="soft">
                    <Accordion.Header>Similar Matches ({softMatches.length})</Accordion.Header>
                    <Accordion.Body>
                        <EvidencePanel
                            apiUrl={apiUrl}
                            items={softMatches}
                        />
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion>

        </>
    );
}

const entities = [
  { label: 'IL-6', id: "uniprot:1000", type:"Gene product" },
  { label: 'IL-7', id: "uniprot:1001", type:"Disease" },
];