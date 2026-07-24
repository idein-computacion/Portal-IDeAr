import React, { useState } from 'react';
import CampusDashboard from './CampusDashboard';
import ClassroomView from './ClassroomView';

export default function CampusMain({ currentUser, globalSede, configLevels, generalConfig, gradeColumns, addNotification }) {
    const [selectedClassroom, setSelectedClassroom] = useState(null);

    if (selectedClassroom) {
        return (
            <ClassroomView 
                classroom={selectedClassroom}
                currentUser={currentUser}
                globalSede={globalSede}
                onBack={() => setSelectedClassroom(null)}
                addNotification={addNotification}
            />
        );
    }

    return (
        <CampusDashboard 
            currentUser={currentUser} 
            globalSede={globalSede} 
            configLevels={configLevels}
            generalConfig={generalConfig}
            onSelectClassroom={setSelectedClassroom} 
        />
    );
}
