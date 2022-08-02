import React, {Fragment, useState} from 'react';
import { connect } from 'react-redux';
import propTypes from 'prop-types';

const Alert = ({ alerts }) => (
	<div className="alert-wrapper">
    	{alerts.map((alert) => (
      		<div key={alert.id} className={`alert alert-${alert.alertType}`}>
        		{alert.msg}
      		</div>
    	))}
	</div>
);

Alert.propTypes = {
	alerts: propTypes.array.isRequired
}

const mapStateToProps = state => ({
	alerts: state.alert
});

export default connect(mapStateToProps)(Alert);