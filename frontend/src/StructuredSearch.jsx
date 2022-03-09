import { Typeahead, Highlighter } from 'react-bootstrap-typeahead';
import {Row, Form, Col, Button, Accordion} from "react-bootstrap";
import {useState, Fragment, useEffect} from "react";
import EvidencePanel from "./components/EvidencePanel";
import {fetchEntities, fetchInteractionTypes, structuredSearch} from "./utils/api";
import { groupBy } from "./utils/utils";

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

    const [groupedMatches, setGroupedMatches] = useState({});



    // Fetch the data after rendering
    useEffect(async () => {
        const entities = await fetchEntities(apiUrl)
        const interactions = await fetchInteractionTypes(apiUrl)

        setControllers(entities)
        setControlleds(entities)
        setInteractionTypes(interactions)
    },  [])

    const sortedGroups = Object.keys(groupedMatches).sort().reverse()

    const accordionPanels = sortedGroups.map(
        (group) => {
            const elems = groupedMatches[group];
            return (
                <Accordion.Item eventKey={group} key={group}>
                    <Accordion.Header>{
                        group.split('_')
                        .map(
                            ([initial, ...rest]) =>
                                [initial.toUpperCase(), ...rest].join("")).join(" ")
                    } ({elems.length})</Accordion.Header>
                    <Accordion.Body>
                        <EvidencePanel
                            apiUrl={apiUrl}
                            items={elems}
                        />
                    </Accordion.Body>
                </Accordion.Item>
            )
        }

    )



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
                        let [__, s_matches] = await structuredSearch(apiUrl, chosenController[0].id, chosenControlled[0].id)

                        const results = groupBy(s_matches, (m) => m.event_type)
                        setGroupedMatches(results)
                        // setSoftMatches(s_matches)
                    }}
                >Search</Button>
              </Col>
            </Row>
            <br />
            <Accordion defaultActiveKey="exact">
                { accordionPanels }
            </Accordion>

        </>
    );
}

const entities = [
  { label: 'IL-6', id: "uniprot:1000", type:"Gene product" },
  { label: 'IL-7', id: "uniprot:1001", type:"Disease" },
];