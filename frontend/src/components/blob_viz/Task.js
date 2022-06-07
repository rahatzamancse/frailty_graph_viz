import React from 'react';
import styled from 'styled-components';
import { Draggable } from 'react-beautiful-dnd';
import { categoryHullColors } from '../../utils/utils';

const Container = styled.div`
    border: 1px solid lightgrey;
    border-radius: 2px;
    padding: 8px;
    margin-bottom: 8px;
    background-color: ${props => (
        // @ts-ignore
        Object.values(categoryHullColors)[props.category-1]
    )};
`;

const Task = ({task, index }) => {
    return (
        <Draggable draggableId={task.id} index={index}>
            {(provided, snapshot) => (
                <Container
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    ref={provided.innerRef}
                    // @ts-ignore
                    category={task.category}
                >
                    {task.label}
                </Container>

            )}
        </Draggable>
    )
};

export default Task;