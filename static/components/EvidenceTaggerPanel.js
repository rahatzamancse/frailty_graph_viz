class EvidenceTaggerPanel extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            newTagName: "",
            tags: ["Feedback Mechanism", "Incorrect sentence", "Duplicate"],
            checks: [true, false, true],
            addButtonDisabled: true
        }
    }

    validTagName(name){
        // if the text field is empty, ignore the new tag
        if(name !== null && name !== ""){
            let tags = this.state.tags
            // If the tag is not already in the list (case insensitive search)
            if(!tags.map( t => t.toLowerCase()).includes(name.toLowerCase()))
                return true
        }

        return false
    }

    handleNewTagChange = (newTagName) => {
        // If the tag name is invalid, disable the button
        const addButtonDisabled = !this.validTagName(newTagName.trim())
        // Update the state, keeping track of the newTagname and addButtonDisabled
        this.setState({newTagName: newTagName, addButtonDisabled:addButtonDisabled})
    }

    handleNewTagClick = () => {

        let newTag = this.state.newTagName.trim()

        if(this.validTagName(newTag)){
            let tags = this.state.tags.slice()
            tags.push(newTag)
            let checks = this.state.checks.slice()
            checks.push(true)
            // TODO add logic to call the back end
            this.setState({tags: tags, newTagName: "", addButtonDisabled: true, checks: checks})
        }

    }

    handleCheck = (ix) => {
        // Fetch the check marks
        let checks = this.state.checks.slice()
        // Toggle the appropriate check mark
        checks[ix] = !checks[ix]
        // TODO: Write here the code to store this with fast api
        // Update the state
        this.setState({checks:checks})
    }

    render() {
        // Instantiate the entries
        const tagElems = Array()
        for(let ix=0;ix < this.state.tags.length; ++ix) {
            const tagName = this.state.tags[ix];
            const checked = this.state.checks[ix];

            tagElems.push(<EvidenceTag tagName={tagName}
                                       checked={checked}
                                       key={ix}
                                       onChange={ () => this.handleCheck(ix)}
            />)
        }

        return (
          <div className="annotator-panel">
              <h4>Tag evidence as:</h4>
              <ul>
                  {/* Render all the tag elements */}
                  {tagElems}
                  <NewEvidenceTag tagName={this.state.newTagName}
                                  disabled={this.state.addButtonDisabled}
                                  onChange={this.handleNewTagChange}
                                  onClick={this.handleNewTagClick} />
              </ul>
          </div>
        );
    }
}

function EvidenceTag(props){
    return (
        <li>
          <label>
              <input  type="checkbox" checked={props.checked}
                 onChange={ props.onChange }
              />
              {props.tagName}
          </label>
        </li>
    );
}

function NewEvidenceTag(props){
    return (
       <li>
           <label>
               <input type="text"
                      value={props.tagName}
                      onChange={ event => props.onChange(event.target.value)} />
           </label>
           <button onClick={props.onClick} disabled={props.disabled}>Add new</button>
       </li>
    )
}